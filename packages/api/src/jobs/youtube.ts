// ============================================
// YOUTUBE INGESTION JOB
// ============================================
// Polls YouTube comments from popular/trending videos

import { scanText, extractCollocations, sanitizeText, containsSlur } from '@fuckometer/shared';
import { 
  upsertHourlyCount, 
  upsertCollocation, 
  logIngestionStart, 
  logIngestionComplete 
} from '../db/queries.js';
import type { ContextTag } from '@fuckometer/shared';

const API_KEY = process.env.YOUTUBE_API_KEY;

// Video IDs to poll - mix of popular/controversial videos with active comments
// These are regularly updated viral videos with lots of comments
const SEARCH_QUERIES = [
  'news today',
  'politics 2026',
  'drama',
  'controversy',
  'rant',
];

interface YouTubeComment {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: {
        textDisplay: string;
        publishedAt: string;
      };
    };
  };
}

interface YouTubeSearchResult {
  id: {
    videoId: string;
  };
}

// Track processed comment IDs to avoid duplicates
const processedComments = new Set<string>();

/**
 * Search for recent videos with active comments
 */
async function searchVideos(query: string, maxResults = 5): Promise<string[]> {
  if (!API_KEY) {
    console.warn('[YouTube] No API key configured');
    return [];
  }
  
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'id');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('order', 'date');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('publishedAfter', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  url.searchParams.set('key', API_KEY);
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`YouTube search error: ${response.status}`);
  }
  
  const data = await response.json() as { items: YouTubeSearchResult[] };
  return data.items?.map(item => item.id.videoId) || [];
}

/**
 * Fetch comments from a video
 */
async function fetchComments(videoId: string, maxResults = 100): Promise<YouTubeComment[]> {
  if (!API_KEY) return [];
  
  const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('order', 'time');
  url.searchParams.set('key', API_KEY);
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    // Comments might be disabled
    if (response.status === 403) {
      return [];
    }
    throw new Error(`YouTube comments error: ${response.status}`);
  }
  
  const data = await response.json() as { items: YouTubeComment[] };
  return data.items || [];
}

/**
 * Main ingestion function for YouTube
 */
export async function ingestYouTube(): Promise<void> {
  if (!API_KEY) {
    console.log('[YouTube] Skipping - no API key configured');
    return;
  }
  
  console.log('[YouTube] Starting ingestion...');
  const logId = logIngestionStart('youtube');
  
  const hourlyBucket = new Date();
  hourlyBucket.setMinutes(0, 0, 0);
  
  // Aggregate counts per term
  const termCounts: Record<string, number> = {};
  const contextCounts: Record<string, Record<ContextTag, number>> = {};
  const collocationsMap: Record<string, Record<string, number>> = {};
  
  let totalComments = 0;
  let profanityComments = 0;
  
  try {
    // Search for videos with each query
    for (const query of SEARCH_QUERIES) {
      console.log(`[YouTube] Searching for "${query}"...`);
      const videoIds = await searchVideos(query, 3);
      
      for (const videoId of videoIds) {
        try {
          const comments = await fetchComments(videoId, 50);
          
          for (const comment of comments) {
            // Skip already processed
            if (processedComments.has(comment.id)) continue;
            processedComments.add(comment.id);
            
            // Limit cache size
            if (processedComments.size > 10000) {
              const first = processedComments.values().next().value;
              if (first) processedComments.delete(first);
            }
            
            totalComments++;
            const text = sanitizeText(comment.snippet.topLevelComment.snippet.textDisplay);
            
            if (containsSlur(text)) continue;
            
            const matches = scanText(text);
            
            if (matches.length > 0) {
              profanityComments++;
              
              for (const match of matches) {
                termCounts[match.term] = (termCounts[match.term] || 0) + match.count;
                
                if (!contextCounts[match.term]) {
                  contextCounts[match.term] = {
                    anger: 0,
                    humor: 0,
                    emphasis: 0,
                    quote: 0,
                    unknown: 0,
                  };
                }
                contextCounts[match.term][match.context]++;
                
                const collocations = extractCollocations(text, match.positions);
                if (!collocationsMap[match.term]) {
                  collocationsMap[match.term] = {};
                }
                for (const col of collocations) {
                  collocationsMap[match.term][col] = (collocationsMap[match.term][col] || 0) + 1;
                }
              }
            }
          }
          
          // Small delay between videos
          await new Promise(r => setTimeout(r, 100));
          
        } catch (error) {
          console.error(`[YouTube] Error fetching video ${videoId}:`, error);
        }
      }
      
      // Delay between searches
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Write aggregated data to database
    const hourStr = hourlyBucket.toISOString();
    
    for (const [term, _count] of Object.entries(termCounts)) {
      const contexts = contextCounts[term];
      const totalCount = Object.values(contexts).reduce((a, b) => a + b, 0);
      
      upsertHourlyCount(term, 'youtube', hourStr, totalCount, contexts);
      
      const colls = collocationsMap[term] || {};
      const topColls = Object.entries(colls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      for (const [colloc, collCount] of topColls) {
        upsertCollocation(term, colloc, 'youtube', collCount);
      }
    }
    
    console.log(`[YouTube] Ingestion complete: ${totalComments} comments, ${profanityComments} with profanity`);
    logIngestionComplete(logId, profanityComments, 'completed');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[YouTube] Ingestion failed:', message);
    logIngestionComplete(logId, 0, 'failed', message);
  }
}
