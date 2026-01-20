// ============================================
// MASTODON INGESTION JOB
// ============================================
// Polls public timeline from a Mastodon instance

import { scanText, extractCollocations, sanitizeText, containsSlur } from '@fuckometer/shared';
import { 
  upsertHourlyCount, 
  upsertCollocation, 
  logIngestionStart, 
  logIngestionComplete 
} from '../db/queries.js';
import type { ContextTag } from '@fuckometer/shared';

// Default instance - can be overridden with env var
const MASTODON_INSTANCE = process.env.MASTODON_INSTANCE || 'https://mastodon.social';

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string; // HTML content
  language: string | null;
  visibility: string;
  // We intentionally don't store account info
}

interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
}

let rateLimitInfo: RateLimitInfo = {
  remaining: 300,
  resetAt: new Date(Date.now() + 5 * 60 * 1000),
};

/**
 * Strip HTML tags from Mastodon content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<p>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch public timeline from Mastodon
 */
async function fetchPublicTimeline(
  maxId?: string, 
  limit = 40
): Promise<{ statuses: MastodonStatus[]; rateLimit: RateLimitInfo }> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    local: 'false', // Include federated posts
  });
  
  if (maxId) {
    params.set('max_id', maxId);
  }
  
  const url = `${MASTODON_INSTANCE}/api/v1/timelines/public?${params}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  // Add auth token if available (for higher rate limits)
  if (process.env.MASTODON_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.MASTODON_ACCESS_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  
  // Parse rate limit headers
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '300', 10);
  const resetTime = response.headers.get('X-RateLimit-Reset');
  const resetAt = resetTime ? new Date(resetTime) : new Date(Date.now() + 5 * 60 * 1000);
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`Rate limited. Reset at: ${resetAt.toISOString()}`);
    }
    throw new Error(`Mastodon API error: ${response.status}`);
  }
  
  const statuses = await response.json() as MastodonStatus[];
  
  return {
    statuses,
    rateLimit: { remaining, resetAt },
  };
}

/**
 * Get the current hour bucket
 */
function getCurrentBucket(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

/**
 * Main ingestion function
 */
export async function ingestMastodon(): Promise<void> {
  console.log(`[Mastodon] Starting ingestion from ${MASTODON_INSTANCE}...`);
  const logId = logIngestionStart('mastodon');
  
  try {
    const bucket = getCurrentBucket();
    const contextCounts: Record<string, Record<ContextTag, number>> = {};
    const collocationsMap: Record<string, Record<string, number>> = {};
    let itemsProcessed = 0;
    let totalFetched = 0;
    let maxId: string | undefined;
    
    // Fetch up to 5 pages (200 statuses) or until rate limited
    const MAX_PAGES = 5;
    
    for (let page = 0; page < MAX_PAGES; page++) {
      // Check rate limit
      if (rateLimitInfo.remaining < 10) {
        console.log(`[Mastodon] Rate limit low (${rateLimitInfo.remaining}), stopping`);
        break;
      }
      
      const { statuses, rateLimit } = await fetchPublicTimeline(maxId);
      rateLimitInfo = rateLimit;
      
      if (statuses.length === 0) break;
      
      totalFetched += statuses.length;
      maxId = statuses[statuses.length - 1].id;
      
      for (const status of statuses) {
        // Skip non-English posts (if language is specified)
        if (status.language && status.language !== 'en') continue;
        
        // Skip private posts (shouldn't be in public timeline, but just in case)
        if (status.visibility !== 'public') continue;
        
        // Extract and sanitize text
        const text = sanitizeText(stripHtml(status.content));
        
        // Skip if it contains slurs (we track aggregate but don't process)
        if (containsSlur(text)) continue;
        
        const matches = scanText(text, true);
        
        if (matches.length > 0) {
          itemsProcessed++;
          
          for (const match of matches) {
            // Aggregate counts
            if (!contextCounts[match.term]) {
              contextCounts[match.term] = {
                anger: 0,
                humor: 0,
                emphasis: 0,
                quote: 0,
                unknown: 0,
              };
            }
            contextCounts[match.term][match.context] += match.count;
            
            // Extract collocations
            const nearby = extractCollocations(text, match.positions);
            if (!collocationsMap[match.term]) {
              collocationsMap[match.term] = {};
            }
            for (const word of nearby) {
              collocationsMap[match.term][word] = (collocationsMap[match.term][word] || 0) + 1;
            }
          }
        }
      }
      
      // Small delay between pages
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`[Mastodon] Fetched ${totalFetched} statuses, ${itemsProcessed} with matches`);
    
    // Write aggregates to database
    for (const [term, contexts] of Object.entries(contextCounts)) {
      const totalCount = Object.values(contexts).reduce((a, b) => a + b, 0);
      upsertHourlyCount(term, 'mastodon', bucket, totalCount, contexts);
    }
    
    // Write collocations
    for (const [term, nearbyWords] of Object.entries(collocationsMap)) {
      for (const [nearbyTerm, count] of Object.entries(nearbyWords)) {
        upsertCollocation(term, nearbyTerm, 'mastodon', count);
      }
    }
    
    console.log(`[Mastodon] Rate limit remaining: ${rateLimitInfo.remaining}`);
    logIngestionComplete(logId, itemsProcessed, 'completed');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Mastodon] Ingestion failed:', message);
    logIngestionComplete(logId, 0, 'failed', message);
  }
}

// Run if called directly
if (process.argv[1]?.includes('mastodon')) {
  ingestMastodon().then(() => {
    console.log('[Mastodon] Done');
    process.exit(0);
  });
}
