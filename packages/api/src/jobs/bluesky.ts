// ============================================
// BLUESKY INGESTION JOB
// ============================================
// Polls public Bluesky feeds via AT Protocol (no auth required for public feeds)

import { scanText, extractCollocations, sanitizeText, containsSlur } from '@fuckometer/shared';
import { 
  upsertHourlyCount, 
  upsertCollocation, 
  logIngestionStart, 
  logIngestionComplete 
} from '../db/queries.js';
import type { ContextTag } from '@fuckometer/shared';

const BSKY_API = 'https://public.api.bsky.app/xrpc';

// Popular accounts to sample from (mix of news, politics, general)
const ACCOUNTS_TO_SAMPLE = [
  'nytimes.com',
  'washingtonpost.com', 
  'bbc.com',
  'theguardian.com',
  'npr.org',
  'aoc.bsky.social',
  'mattgaetz.bsky.social',
  'taylorlorenz.bsky.social',
  'krassenstein.bsky.social',
  'colbertlateshow.bsky.social',
];

interface BlueskyPost {
  uri: string;
  cid: string;
  record: {
    text: string;
    createdAt: string;
  };
}

interface BlueskyFeedResponse {
  feed: Array<{
    post: BlueskyPost;
  }>;
  cursor?: string;
}

// Track last seen post per account
const lastSeenUris: Record<string, string> = {};

/**
 * Fetch recent posts from an account's feed
 */
async function fetchAccountFeed(actor: string, limit = 50): Promise<BlueskyPost[]> {
  try {
    const url = `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        // Account might not exist or be private
        return [];
      }
      throw new Error(`Bluesky API error: ${response.status}`);
    }
    
    const data = await response.json() as BlueskyFeedResponse;
    return data.feed?.map(f => f.post) || [];
  } catch (error) {
    console.error(`[Bluesky] Error fetching ${actor}:`, error);
    return [];
  }
}

/**
 * Fetch posts from a popular feed
 */
async function fetchPopularFeed(limit = 100): Promise<BlueskyPost[]> {
  try {
    // Use "What's Hot" feed
    const url = `${BSKY_API}/app.bsky.feed.getFeed?feed=at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as BlueskyFeedResponse;
    return data.feed?.map(f => f.post) || [];
  } catch {
    return [];
  }
}

/**
 * Main ingestion function for Bluesky
 */
export async function ingestBluesky(): Promise<void> {
  console.log('[Bluesky] Starting ingestion...');
  const logId = logIngestionStart('bluesky');
  
  const hourlyBucket = new Date();
  hourlyBucket.setMinutes(0, 0, 0);
  const bucket = hourlyBucket.toISOString();
  
  // Aggregate counts
  const contextCounts: Record<string, Record<ContextTag, number>> = {};
  const collocationsMap: Record<string, Record<string, number>> = {};
  
  let postsProcessed = 0;
  let postsWithProfanity = 0;
  const seenUris = new Set<string>();
  
  try {
    // Collect posts from multiple sources
    const allPosts: BlueskyPost[] = [];
    
    // Fetch from popular feed first
    console.log('[Bluesky] Fetching popular feed...');
    const popularPosts = await fetchPopularFeed(100);
    allPosts.push(...popularPosts);
    
    // Fetch from individual accounts
    for (const account of ACCOUNTS_TO_SAMPLE) {
      console.log(`[Bluesky] Fetching @${account}...`);
      const posts = await fetchAccountFeed(account, 30);
      allPosts.push(...posts);
      
      // Small delay between accounts
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`[Bluesky] Collected ${allPosts.length} posts`);
    
    // Process posts
    for (const post of allPosts) {
      // Skip duplicates
      if (seenUris.has(post.uri)) continue;
      seenUris.add(post.uri);
      
      // Skip already-processed posts
      const account = post.uri.split('/')[2];
      if (lastSeenUris[account] === post.uri) continue;
      
      const text = sanitizeText(post.record.text);
      
      // Skip slurs
      if (containsSlur(text)) {
        continue;
      }
      
      const matches = scanText(text);
      
      if (matches.length > 0) {
        postsWithProfanity++;
        
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
      
      postsProcessed++;
    }
    
    // Update last seen URIs
    for (const post of allPosts) {
      const account = post.uri.split('/')[2];
      lastSeenUris[account] = post.uri;
    }
    
    // Write to database
    for (const [term, contexts] of Object.entries(contextCounts)) {
      const totalCount = Object.values(contexts).reduce((a, b) => a + b, 0);
      upsertHourlyCount(term, 'bluesky', bucket, totalCount, contexts);
    }
    
    for (const [term, nearbyWords] of Object.entries(collocationsMap)) {
      for (const [nearbyTerm, count] of Object.entries(nearbyWords)) {
        upsertCollocation(term, nearbyTerm, 'bluesky', count);
      }
    }
    
    console.log(`[Bluesky] Ingestion complete: ${postsProcessed} posts processed, ${postsWithProfanity} with profanity`);
    logIngestionComplete(logId, postsWithProfanity, 'completed');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Bluesky] Ingestion failed:', message);
    logIngestionComplete(logId, 0, 'failed', message);
  }
}
