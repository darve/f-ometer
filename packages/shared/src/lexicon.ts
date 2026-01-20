// ============================================
// CURATED PROFANITY LEXICON
// ~100 terms with variants, categorized
// ============================================

export interface LexiconEntry {
  /** Canonical form */
  term: string;
  /** Regex pattern to match variants */
  pattern: RegExp;
  /** Severity: 1 = mild, 2 = moderate, 3 = strong */
  severity: 1 | 2 | 3;
  /** Category for grouping */
  category: 'general' | 'sexual' | 'scatological' | 'religious' | 'slur';
  /** If true, this is a slur and should be excluded from example snippets */
  isSlur: boolean;
}

/**
 * Build a regex that matches a word and common variants
 * Handles: plurals, -ing, -ed, -er, asterisk censoring, letter substitution
 */
function buildPattern(base: string, extras: string[] = []): RegExp {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Common letter substitutions
  const substituted = escaped
    .replace(/a/gi, '[a@4]')
    .replace(/e/gi, '[e3]')
    .replace(/i/gi, '[i1!]')
    .replace(/o/gi, '[o0]')
    .replace(/s/gi, '[s$5]')
    .replace(/u/gi, '[uv]');
  
  // Allow asterisks/symbols between letters for censored versions
  const withCensoring = substituted.split('').join('[\\*\\-_]?');
  
  // Build alternation with extras
  const patterns = [withCensoring, ...extras].join('|');
  
  // Word boundary, optional suffixes
  return new RegExp(`\\b(${patterns})(s|ed|ing|er|ers|in|in')?\\b`, 'gi');
}

export const LEXICON: LexiconEntry[] = [
  // === GENERAL PROFANITY ===
  { term: 'fuck', pattern: buildPattern('fuck', ['fck', 'fuk', 'phuck']), severity: 3, category: 'general', isSlur: false },
  { term: 'shit', pattern: buildPattern('shit', ['sht', 'shite']), severity: 2, category: 'scatological', isSlur: false },
  { term: 'damn', pattern: buildPattern('damn', ['dam', 'dammit', 'damnit']), severity: 1, category: 'religious', isSlur: false },
  { term: 'hell', pattern: buildPattern('hell', ['heck']), severity: 1, category: 'religious', isSlur: false },
  { term: 'ass', pattern: buildPattern('ass', ['arse']), severity: 2, category: 'general', isSlur: false },
  { term: 'asshole', pattern: buildPattern('asshole', ['arsehole', 'a-hole']), severity: 2, category: 'general', isSlur: false },
  { term: 'bastard', pattern: buildPattern('bastard'), severity: 2, category: 'general', isSlur: false },
  { term: 'bitch', pattern: buildPattern('bitch', ['biatch']), severity: 2, category: 'general', isSlur: false },
  { term: 'crap', pattern: buildPattern('crap'), severity: 1, category: 'scatological', isSlur: false },
  { term: 'piss', pattern: buildPattern('piss'), severity: 1, category: 'scatological', isSlur: false },
  { term: 'bullshit', pattern: buildPattern('bullshit', ['bs', 'bull shit']), severity: 2, category: 'scatological', isSlur: false },
  { term: 'horseshit', pattern: buildPattern('horseshit'), severity: 2, category: 'scatological', isSlur: false },
  { term: 'goddam', pattern: buildPattern('goddam', ['goddamn', 'goddammit']), severity: 2, category: 'religious', isSlur: false },
  { term: 'jesus', pattern: buildPattern('jesus christ', ['jesus h christ']), severity: 1, category: 'religious', isSlur: false },
  { term: 'bloody', pattern: buildPattern('bloody'), severity: 1, category: 'general', isSlur: false },
  { term: 'bugger', pattern: buildPattern('bugger'), severity: 1, category: 'general', isSlur: false },
  { term: 'bollocks', pattern: buildPattern('bollocks', ['bollox']), severity: 2, category: 'general', isSlur: false },
  { term: 'wanker', pattern: buildPattern('wanker'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'tosser', pattern: buildPattern('tosser'), severity: 1, category: 'general', isSlur: false },
  { term: 'sod', pattern: buildPattern('sod off', ['sodding']), severity: 1, category: 'general', isSlur: false },
  { term: 'twat', pattern: buildPattern('twat'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'prick', pattern: buildPattern('prick'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'dick', pattern: buildPattern('dick', ['dck']), severity: 2, category: 'sexual', isSlur: false },
  { term: 'dickhead', pattern: buildPattern('dickhead'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'cock', pattern: buildPattern('cock'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'cunt', pattern: buildPattern('cunt'), severity: 3, category: 'sexual', isSlur: false },
  { term: 'motherfucker', pattern: buildPattern('motherfucker', ['mofo', 'mf', 'mother fucker']), severity: 3, category: 'general', isSlur: false },
  { term: 'fuckwit', pattern: buildPattern('fuckwit'), severity: 3, category: 'general', isSlur: false },
  { term: 'dipshit', pattern: buildPattern('dipshit'), severity: 2, category: 'scatological', isSlur: false },
  { term: 'shithead', pattern: buildPattern('shithead'), severity: 2, category: 'scatological', isSlur: false },
  { term: 'jackass', pattern: buildPattern('jackass'), severity: 2, category: 'general', isSlur: false },
  { term: 'dumbass', pattern: buildPattern('dumbass'), severity: 2, category: 'general', isSlur: false },
  { term: 'badass', pattern: buildPattern('badass'), severity: 1, category: 'general', isSlur: false },
  { term: 'clusterfuck', pattern: buildPattern('clusterfuck'), severity: 3, category: 'general', isSlur: false },
  { term: 'fubar', pattern: buildPattern('fubar'), severity: 2, category: 'general', isSlur: false },
  { term: 'snafu', pattern: buildPattern('snafu'), severity: 1, category: 'general', isSlur: false },
  { term: 'wtf', pattern: /\bwtf\b/gi, severity: 2, category: 'general', isSlur: false },
  { term: 'stfu', pattern: /\bstfu\b/gi, severity: 2, category: 'general', isSlur: false },
  { term: 'omfg', pattern: /\bomfg\b/gi, severity: 2, category: 'general', isSlur: false },
  { term: 'lmfao', pattern: /\blmf?ao\b/gi, severity: 2, category: 'general', isSlur: false },
  { term: 'af', pattern: /\baf\b/gi, severity: 1, category: 'general', isSlur: false },
  { term: 'effing', pattern: buildPattern('effing', ['eff', 'effed']), severity: 1, category: 'general', isSlur: false },
  { term: 'freaking', pattern: buildPattern('freaking', ['freakin', 'frickin', 'fricking']), severity: 1, category: 'general', isSlur: false },
  { term: 'screw', pattern: buildPattern('screw', ['screwed']), severity: 1, category: 'general', isSlur: false },
  { term: 'jerk', pattern: buildPattern('jerk', ['jerkoff']), severity: 1, category: 'general', isSlur: false },
  { term: 'douche', pattern: buildPattern('douche', ['douchebag', 'douchy']), severity: 2, category: 'general', isSlur: false },
  { term: 'whore', pattern: buildPattern('whore'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'slut', pattern: buildPattern('slut'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'skank', pattern: buildPattern('skank'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'hoe', pattern: /\bhoe(s)?\b/gi, severity: 2, category: 'sexual', isSlur: false },
  { term: 'cum', pattern: buildPattern('cum'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'jizz', pattern: buildPattern('jizz'), severity: 2, category: 'sexual', isSlur: false },
  { term: 'blowjob', pattern: buildPattern('blowjob', ['blow job', 'bj']), severity: 2, category: 'sexual', isSlur: false },
  { term: 'handjob', pattern: buildPattern('handjob', ['hand job', 'hj']), severity: 2, category: 'sexual', isSlur: false },
  
  // === REGIONAL VARIANTS ===
  { term: 'merde', pattern: buildPattern('merde'), severity: 2, category: 'scatological', isSlur: false }, // French
  { term: 'scheisse', pattern: buildPattern('scheisse', ['scheiße']), severity: 2, category: 'scatological', isSlur: false }, // German
  { term: 'mierda', pattern: buildPattern('mierda'), severity: 2, category: 'scatological', isSlur: false }, // Spanish
  { term: 'puta', pattern: buildPattern('puta'), severity: 2, category: 'sexual', isSlur: false }, // Spanish
  { term: 'pendejo', pattern: buildPattern('pendejo'), severity: 2, category: 'general', isSlur: false }, // Spanish
  { term: 'chingada', pattern: buildPattern('chingada', ['chingar']), severity: 3, category: 'general', isSlur: false }, // Spanish
  { term: 'cazzo', pattern: buildPattern('cazzo'), severity: 2, category: 'sexual', isSlur: false }, // Italian
  { term: 'merda', pattern: buildPattern('merda'), severity: 2, category: 'scatological', isSlur: false }, // Italian/Portuguese
  
  // === MILD / EUPHEMISMS ===
  { term: 'darn', pattern: buildPattern('darn'), severity: 1, category: 'general', isSlur: false },
  { term: 'gosh', pattern: buildPattern('gosh'), severity: 1, category: 'religious', isSlur: false },
  { term: 'shoot', pattern: buildPattern('shoot'), severity: 1, category: 'general', isSlur: false },
  { term: 'fudge', pattern: buildPattern('fudge'), severity: 1, category: 'general', isSlur: false },
  { term: 'crud', pattern: buildPattern('crud'), severity: 1, category: 'general', isSlur: false },
  { term: 'heck', pattern: buildPattern('heck'), severity: 1, category: 'religious', isSlur: false },
  { term: 'butt', pattern: buildPattern('butt', ['butthead']), severity: 1, category: 'general', isSlur: false },
  { term: 'booty', pattern: buildPattern('booty'), severity: 1, category: 'general', isSlur: false },
  
  // === INTENSIFIERS ===
  { term: 'bloody', pattern: buildPattern('bloody'), severity: 1, category: 'general', isSlur: false },
  { term: 'flipping', pattern: buildPattern('flipping'), severity: 1, category: 'general', isSlur: false },
  { term: 'blasted', pattern: buildPattern('blasted'), severity: 1, category: 'general', isSlur: false },
  { term: 'bleeding', pattern: buildPattern('bleeding'), severity: 1, category: 'general', isSlur: false },
  
  // === COMPOUND TERMS ===
  { term: 'shitshow', pattern: buildPattern('shitshow', ['shit show']), severity: 2, category: 'scatological', isSlur: false },
  { term: 'shithole', pattern: buildPattern('shithole', ['shit hole']), severity: 2, category: 'scatological', isSlur: false },
  { term: 'shitstorm', pattern: buildPattern('shitstorm', ['shit storm']), severity: 2, category: 'scatological', isSlur: false },
  { term: 'ratfuck', pattern: buildPattern('ratfuck'), severity: 3, category: 'general', isSlur: false },
  { term: 'mindfuck', pattern: buildPattern('mindfuck'), severity: 3, category: 'general', isSlur: false },
  { term: 'batshit', pattern: buildPattern('batshit'), severity: 2, category: 'scatological', isSlur: false },
  { term: 'apeshit', pattern: buildPattern('apeshit'), severity: 2, category: 'scatological', isSlur: false },
  { term: 'chickenshit', pattern: buildPattern('chickenshit'), severity: 2, category: 'scatological', isSlur: false },
  
  // === SLURS (tracked but never shown in examples) ===
  // These are included ONLY for aggregate trend analysis
  // They are NEVER displayed in snippets or examples
  { term: '[slur-racial]', pattern: /\b(placeholder-never-match)\b/gi, severity: 3, category: 'slur', isSlur: true },
  // Real slur patterns would go here but are intentionally not included in this open source version
];

/** Quick lookup set of canonical terms */
export const TERM_SET = new Set(LEXICON.map(e => e.term));

/** Get safe terms only (exclude slurs) */
export const SAFE_LEXICON = LEXICON.filter(e => !e.isSlur);

/** Get terms by category */
export function getTermsByCategory(category: LexiconEntry['category']): LexiconEntry[] {
  return LEXICON.filter(e => e.category === category);
}

/** Get terms by severity */
export function getTermsBySeverity(severity: 1 | 2 | 3): LexiconEntry[] {
  return LEXICON.filter(e => e.severity === severity);
}
