// ============================================
// CORE TYPES FOR FUCKOMETER
// ============================================

/** Data source identifiers */
export type Source = 'gdelt' | 'mastodon' | 'hackernews' | 'bluesky' | 'youtube';

/** Context classification for swear usage */
export type ContextTag = 'anger' | 'humor' | 'emphasis' | 'quote' | 'unknown';

/** Time bucket for aggregation */
export interface TimeBucket {
  /** ISO 8601 timestamp (start of bucket) */
  timestamp: string;
  /** Bucket duration in minutes (60 = hourly, 1440 = daily) */
  duration: number;
}

/** Aggregated count for a term in a time bucket */
export interface TermCount {
  term: string;
  source: Source;
  bucket: TimeBucket;
  count: number;
  contextBreakdown: Record<ContextTag, number>;
}

/** Hourly aggregate stored in DB */
export interface HourlyAggregate {
  id: number;
  term: string;
  source: Source;
  bucketStart: string; // ISO timestamp
  count: number;
  angerCount: number;
  humorCount: number;
  emphasisCount: number;
  quoteCount: number;
  unknownCount: number;
}

/** Co-occurrence / collocation data */
export interface Collocation {
  term: string;
  nearbyTerm: string;
  count: number;
  source: Source;
}

/** Spike detection result */
export interface Spike {
  term: string;
  source: Source;
  timestamp: string;
  currentRate: number;
  baselineRate: number;
  multiplier: number;
  possibleEvent?: string;
}

/** Heatmap cell (hour-of-day × day-of-week) */
export interface HeatmapCell {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hourOfDay: number; // 0-23
  count: number;
}

/** Treemap node for share-of-total */
export interface TreemapNode {
  term: string;
  count: number;
  percentage: number;
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    fetchedAt: string;
    source: Source | 'combined';
  };
}

/** Time series data point */
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

/** Time series for a term */
export interface TermTimeSeries {
  term: string;
  source: Source;
  points: TimeSeriesPoint[];
  spikes: Spike[];
}

/** Dashboard summary stats */
export interface DashboardStats {
  totalCountToday: number;
  totalCountYesterday: number;
  changePercent: number;
  topTerms: Array<{ term: string; count: number }>;
  latestSpikes: Spike[];
}

/** News event for overlay */
export interface NewsEvent {
  timestamp: string;
  headline: string;
  source: string;
  url?: string;
}
