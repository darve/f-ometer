// ============================================
// HACKER NEWS INGESTION JOB
// ============================================
// Polls HackerNews comments via Firebase API (no auth required)

import { scanText, extractCollocations, sanitizeText, containsSlur } from '@fuckometer/shared';
import { 
  upsertHourlyCount, 
  upsertCollocation, 
  logIngestionStart, 
  logIngestionComplete 
} from '../db/queries.js';
import type { ContextTag } from '@fuckometer/shared';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  text?: string;
  time: number;
  kids?: number[];
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
}

// Track last processed comment ID to avoid duplicates
let lastMaxId = 0;

/**
 * Fetch a single HN item
 */
async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!response.ok) return null;
    return await response.json() as HNItem;
  } catch {
    return null;
  }
}

/**
 * Fetch max item ID (latest item on HN)
 */
async function fetchMaxItemId(): Promise<number> {
  const response = await fetch(`${HN_API_BASE}/maxitem.json`);
  return await response.json() as number;
}

/**
 * Main ingestion function for HackerNews
 */
export async function ingestHackerNews(): Promise<void> {
  console.log('[HackerNews] Starting ingestion...');
  const logId = logIngestionStart('hackernews');
  
  const hourlyBucket = new Date();
  hourlyBucket.setMinutes(0, 0, 0);
  const bucket = hourlyBucket.toISOString();
  
  // Aggregate counts
  const contextCounts: Record<string, Record<ContextTag, number>> = {};
  const collocationsMap: Record<string, Record<string, number>> = {};
  
  let itemsProcessed = 0;
  let commentsWithProfanity = 0;
  
  try {
    const currentMaxId = await fetchMaxItemId();
    
    // On first run, just set the baseline
    if (lastMaxId === 0) {
      lastMaxId = currentMaxId - 200; // Start with last 200 items
    }
    
    // Limit to 500 items per run to avoid timeouts
    const startId = Math.max(lastMaxId + 1, currentMaxId - 500);
    const itemIds = Array.from(
      { length: currentMaxId - startId + 1 }, 
      (_, i) => startId + i
    );
    
    console.log(`[HackerNews] Fetching items ${startId} to ${currentMaxId} (${itemIds.length} items)`);
    
    // Fetch in batches of 50
    for (let i = 0; i < itemIds.length; i += 50) {
      const batch = itemIds.slice(i, i + 50);
      const items = await Promise.all(batch.map(fetchItem));
      
      for (const item of items) {
        if (!item || item.type !== 'comment' || !item.text || item.deleted || item.dead) {
          continue;
        }
        
        // Strip HTML tags from comment text
        const text = sanitizeText(item.text.replace(/<[^>]*>/g, ' '));
        
        // Skip slurs
        if (containsSlur(text)) {
          continue;
        }
        
        const matches = scanText(text);
        
        if (matches.length > 0) {
          commentsWithProfanity++;
          
          for (const match of matches) {
            // Track context
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
        
        itemsProcessed++;
      }
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 100));
    }
    
    lastMaxId = currentMaxId;
    
    // Write to database
    for (const [term, contexts] of Object.entries(contextCounts)) {
      const totalCount = Object.values(contexts).reduce((a, b) => a + b, 0);
      upsertHourlyCount(term, 'hackernews', bucket, totalCount, contexts);
    }
    
    for (const [term, nearbyWords] of Object.entries(collocationsMap)) {
      for (const [nearbyTerm, count] of Object.entries(nearbyWords)) {
        upsertCollocation(term, nearbyTerm, 'hackernews', count);
      }
    }
    
    console.log(`[HackerNews] Ingestion complete: ${itemsProcessed} comments processed, ${commentsWithProfanity} with profanity`);
    logIngestionComplete(logId, commentsWithProfanity, 'completed');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HackerNews] Ingestion failed:', message);
    logIngestionComplete(logId, 0, 'failed', message);
  }
}
