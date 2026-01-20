// ============================================
// GDELT INGESTION JOB
// ============================================
// Fetches news articles from GDELT and analyzes profanity

import { scanText, extractCollocations, sanitizeText } from '@fuckometer/shared';
import { 
  upsertHourlyCount, 
  upsertCollocation, 
  logIngestionStart, 
  logIngestionComplete,
  insertNewsEvent 
} from '../db/queries.js';
import type { ContextTag } from '@fuckometer/shared';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

/**
 * Query GDELT for recent English news articles
 */
async function fetchGdeltArticles(query: string, maxRecords = 250): Promise<GdeltArticle[]> {
  // GDELT query format: query terms + language filter
  const fullQuery = `${query} sourcelang:english`;
  
  const params = new URLSearchParams({
    query: fullQuery,
    mode: 'artlist',
    maxrecords: maxRecords.toString(),
    format: 'json',
    timespan: '1h', // Last hour
  });
  
  const url = `${GDELT_DOC_API}?${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Handle empty or error responses
    if (!text || text.startsWith('Queries')) {
      console.log('[GDELT] Empty or rate-limited response for query:', query);
      return [];
    }
    
    const data = JSON.parse(text) as GdeltResponse;
    return data.articles || [];
  } catch (error) {
    console.error('Failed to fetch GDELT articles:', error);
    return [];
  }
}

/**
 * Get the current hour bucket (ISO string, truncated to hour)
 */
function getCurrentBucket(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

/**
 * Main ingestion function
 */
export async function ingestGdelt(): Promise<void> {
  console.log('[GDELT] Starting ingestion...');
  const logId = logIngestionStart('gdelt');
  
  try {
    // Search GDELT directly for profanity terms
    // GDELT searches full article text, so we'll find articles containing these words
    // even if the title is sanitized
    const profanityQueries = [
      'fuck',
      'shit', 
      'damn',
      'bullshit',
      'asshole',
      'bastard',
    ];
    
    const allArticles: GdeltArticle[] = [];
    
    for (const query of profanityQueries) {
      const articles = await fetchGdeltArticles(query, 50);
      
      // For GDELT, the query term IS the profanity we're tracking
      // since GDELT searches full text but only returns titles
      for (const article of articles) {
        // Tag the article with which term it matched
        (article as GdeltArticle & { matchedTerm: string }).matchedTerm = query;
      }
      
      allArticles.push(...articles);
      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 500));
    }
    
    const bucket = getCurrentBucket();
    const contextCounts: Record<string, Record<ContextTag, number>> = {};
    const collocationsMap: Record<string, Record<string, number>> = {};
    let itemsProcessed = 0;
    
    for (const article of allArticles) {
      const articleWithTerm = article as GdeltArticle & { matchedTerm?: string };
      const text = sanitizeText(article.title);
      
      // If we have a matched term from the GDELT query, count it directly
      // (since GDELT found this article by searching full text for this term)
      if (articleWithTerm.matchedTerm) {
        const term = articleWithTerm.matchedTerm;
        itemsProcessed++;
        
        if (!contextCounts[term]) {
          contextCounts[term] = {
            anger: 0,
            humor: 0,
            emphasis: 0,
            quote: 0,
            unknown: 0,
          };
        }
        // Can't determine context from title alone, mark as unknown
        contextCounts[term].unknown += 1;
        
        // Extract collocations from the title
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (!collocationsMap[term]) {
          collocationsMap[term] = {};
        }
        for (const word of words.slice(0, 10)) {
          collocationsMap[term][word] = (collocationsMap[term][word] || 0) + 1;
        }
        
        // Store as a news event for spike correlation
        insertNewsEvent(
          article.seendate || bucket,
          article.title,
          article.domain,
          article.url
        );
      } else {
        // Fallback: scan title for matches (original behavior)
        const matches = scanText(text, true);
        
        if (matches.length > 0) {
          itemsProcessed++;
          
          for (const match of matches) {
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
            
            const nearby = extractCollocations(text, match.positions);
            if (!collocationsMap[match.term]) {
              collocationsMap[match.term] = {};
            }
            for (const word of nearby) {
              collocationsMap[match.term][word] = (collocationsMap[match.term][word] || 0) + 1;
            }
          }
          
          insertNewsEvent(
            article.seendate || bucket,
            article.title,
            article.domain,
            article.url
          );
        }
      }
    }
    
    // Write aggregates to database
    for (const [term, contexts] of Object.entries(contextCounts)) {
      const totalCount = Object.values(contexts).reduce((a, b) => a + b, 0);
      upsertHourlyCount(term, 'gdelt', bucket, totalCount, contexts);
    }
    
    // Write collocations
    for (const [term, nearbyWords] of Object.entries(collocationsMap)) {
      for (const [nearbyTerm, count] of Object.entries(nearbyWords)) {
        upsertCollocation(term, nearbyTerm, 'gdelt', count);
      }
    }
    
    console.log(`[GDELT] Processed ${itemsProcessed} articles with matches`);
    logIngestionComplete(logId, itemsProcessed, 'completed');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GDELT] Ingestion failed:', message);
    logIngestionComplete(logId, 0, 'failed', message);
  }
}

// Run if called directly
if (process.argv[1]?.includes('gdelt')) {
  ingestGdelt().then(() => {
    console.log('[GDELT] Done');
    process.exit(0);
  });
}
