// ============================================
// TEXT ANALYSIS UTILITIES
// ============================================

import { LEXICON, SAFE_LEXICON, type LexiconEntry } from './lexicon.js';
import type { ContextTag } from './types.js';

/** Match result from scanning text */
export interface MatchResult {
  term: string;
  count: number;
  positions: number[];
  context: ContextTag;
}

/** Context classification patterns */
const CONTEXT_PATTERNS = {
  anger: /\b(angry|furious|hate|pissed|mad|rage|wtf|stfu|shut up|die|kill)\b/gi,
  humor: /\b(lol|lmao|rofl|haha|😂|🤣|joke|funny|hilarious)\b/gi,
  quote: /["'"']|said|wrote|tweeted|posted|according to/gi,
  emphasis: /\b(so|very|really|extremely|absolutely|totally|af)\b/gi,
};

/**
 * Classify the context of profanity usage in text
 */
export function classifyContext(text: string, matchPosition: number): ContextTag {
  // Get surrounding context (50 chars before and after)
  const start = Math.max(0, matchPosition - 50);
  const end = Math.min(text.length, matchPosition + 50);
  const context = text.slice(start, end).toLowerCase();
  
  // Check patterns in priority order
  if (CONTEXT_PATTERNS.quote.test(context)) return 'quote';
  if (CONTEXT_PATTERNS.anger.test(context)) return 'anger';
  if (CONTEXT_PATTERNS.humor.test(context)) return 'humor';
  if (CONTEXT_PATTERNS.emphasis.test(context)) return 'emphasis';
  
  return 'unknown';
}

/**
 * Scan text for profanity matches
 * Returns aggregated counts per term with context classification
 */
export function scanText(text: string, useSafeLexicon = true): MatchResult[] {
  const lexicon = useSafeLexicon ? SAFE_LEXICON : LEXICON;
  const results: Map<string, MatchResult> = new Map();
  
  for (const entry of lexicon) {
    // Reset regex lastIndex
    entry.pattern.lastIndex = 0;
    
    let match: RegExpExecArray | null;
    while ((match = entry.pattern.exec(text)) !== null) {
      const existing = results.get(entry.term);
      const context = classifyContext(text, match.index);
      
      if (existing) {
        existing.count++;
        existing.positions.push(match.index);
        // Use most common context (simplified: just use latest)
      } else {
        results.set(entry.term, {
          term: entry.term,
          count: 1,
          positions: [match.index],
          context,
        });
      }
    }
  }
  
  return Array.from(results.values());
}

/**
 * Extract words near profanity matches for collocation analysis
 * Returns nearby words (excluding stop words)
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'our', 'their', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'if',
  'rt', 'via', 'amp', // social media artifacts
]);

export function extractCollocations(
  text: string,
  matchPositions: number[],
  windowSize = 5
): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const collocations: string[] = [];
  
  for (const pos of matchPositions) {
    // Find word index at this position
    let charCount = 0;
    let wordIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      if (charCount >= pos) {
        wordIndex = i;
        break;
      }
      charCount += words[i].length + 1; // +1 for space
    }
    
    // Get surrounding words
    const start = Math.max(0, wordIndex - windowSize);
    const end = Math.min(words.length, wordIndex + windowSize + 1);
    
    for (let i = start; i < end; i++) {
      if (i === wordIndex) continue; // Skip the match itself
      
      const word = words[i].replace(/[^a-z]/g, '');
      if (word.length > 2 && !STOP_WORDS.has(word)) {
        collocations.push(word);
      }
    }
  }
  
  return collocations;
}

/**
 * Sanitize text by removing usernames, URLs, and other PII
 */
export function sanitizeText(text: string): string {
  return text
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, '[URL]')
    // Remove @mentions
    .replace(/@[\w]+/g, '[USER]')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    // Remove phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if text contains any slurs (for filtering)
 */
export function containsSlur(text: string): boolean {
  for (const entry of LEXICON) {
    if (entry.isSlur) {
      entry.pattern.lastIndex = 0;
      if (entry.pattern.test(text)) {
        return true;
      }
    }
  }
  return false;
}
