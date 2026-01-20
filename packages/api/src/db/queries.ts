// ============================================
// DATABASE QUERIES
// ============================================

import type Database from 'better-sqlite3';
import type { 
  HourlyAggregate, 
  Collocation, 
  Source, 
  ContextTag,
  Spike,
  HeatmapCell,
  TreemapNode,
  TimeSeriesPoint,
  NewsEvent 
} from '@fuckometer/shared';
import { getDb } from './migrate.js';

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    db = getDb();
  }
  return db;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export function upsertHourlyCount(
  term: string,
  source: Source,
  bucketStart: string,
  count: number,
  contextCounts: Record<ContextTag, number>
): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT INTO hourly_counts (term, source, bucket_start, count, anger_count, humor_count, emphasis_count, quote_count, unknown_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(term, source, bucket_start) DO UPDATE SET
      count = count + excluded.count,
      anger_count = anger_count + excluded.anger_count,
      humor_count = humor_count + excluded.humor_count,
      emphasis_count = emphasis_count + excluded.emphasis_count,
      quote_count = quote_count + excluded.quote_count,
      unknown_count = unknown_count + excluded.unknown_count
  `);
  
  stmt.run(
    term,
    source,
    bucketStart,
    count,
    contextCounts.anger || 0,
    contextCounts.humor || 0,
    contextCounts.emphasis || 0,
    contextCounts.quote || 0,
    contextCounts.unknown || 0
  );
}

export function upsertCollocation(
  term: string,
  nearbyTerm: string,
  source: Source,
  count = 1
): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT INTO collocations (term, nearby_term, source, count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(term, nearby_term, source) DO UPDATE SET
      count = count + excluded.count,
      updated_at = datetime('now')
  `);
  
  stmt.run(term, nearbyTerm, source, count);
}

export function logIngestionStart(source: Source): number {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT INTO ingestion_log (source, started_at, status)
    VALUES (?, datetime('now'), 'running')
  `);
  
  const result = stmt.run(source);
  return Number(result.lastInsertRowid);
}

export function logIngestionComplete(
  id: number,
  itemsProcessed: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    UPDATE ingestion_log
    SET completed_at = datetime('now'),
        items_processed = ?,
        status = ?,
        error_message = ?
    WHERE id = ?
  `);
  
  stmt.run(itemsProcessed, status, errorMessage || null, id);
}

export function insertNewsEvent(
  timestamp: string,
  headline: string,
  source: string,
  url?: string
): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT INTO news_events (timestamp, headline, source, url)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(timestamp, headline, source, url || null);
}

// ============================================
// READ OPERATIONS
// ============================================

export function getTimeSeries(
  term: string,
  source: Source | 'combined',
  startDate: string,
  endDate: string
): TimeSeriesPoint[] {
  const database = getDatabase();
  
  let query: string;
  let params: unknown[];
  
  // Special "all" term aggregates across all profanity
  const isAll = term === 'all';
  const termFilter = isAll ? '' : 'AND term = ?';
  
  if (source === 'combined') {
    query = `
      SELECT bucket_start as timestamp, SUM(count) as value
      FROM hourly_counts
      WHERE bucket_start >= ? AND bucket_start <= ? ${isAll ? '' : 'AND term = ?'}
      GROUP BY bucket_start
      ORDER BY bucket_start
    `;
    params = isAll ? [startDate, endDate] : [startDate, endDate, term];
  } else {
    query = `
      SELECT bucket_start as timestamp, SUM(count) as value
      FROM hourly_counts
      WHERE source = ? AND bucket_start >= ? AND bucket_start <= ? ${isAll ? '' : 'AND term = ?'}
      GROUP BY bucket_start
      ORDER BY bucket_start
    `;
    params = isAll ? [source, startDate, endDate] : [source, startDate, endDate, term];
  }
  
  const stmt = database.prepare(query);
  return stmt.all(...params) as TimeSeriesPoint[];
}

export function getHeatmap(
  term: string,
  source: Source | 'combined',
  days = 30
): HeatmapCell[] {
  const database = getDatabase();
  
  const isAll = term === 'all';
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const termFilter = isAll ? '' : 'AND term = ?';
  
  let params: unknown[];
  if (isAll) {
    params = source === 'combined' ? [days] : [source, days];
  } else {
    params = source === 'combined' ? [term, days] : [term, source, days];
  }
  
  const query = `
    SELECT 
      CAST(strftime('%w', bucket_start) AS INTEGER) as dayOfWeek,
      CAST(strftime('%H', bucket_start) AS INTEGER) as hourOfDay,
      SUM(count) as count
    FROM hourly_counts
    WHERE 1=1 ${termFilter} ${sourceFilter}
      AND bucket_start >= datetime('now', '-' || ? || ' days')
    GROUP BY dayOfWeek, hourOfDay
  `;
  
  const stmt = database.prepare(query);
  return stmt.all(...params) as HeatmapCell[];
}

export function getTreemap(
  source: Source | 'combined',
  startDate: string,
  endDate: string
): TreemapNode[] {
  const database = getDatabase();
  
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const params = source === 'combined' ? [startDate, endDate] : [source, startDate, endDate];
  
  const query = `
    WITH totals AS (
      SELECT SUM(count) as total
      FROM hourly_counts
      WHERE bucket_start >= ? AND bucket_start <= ? ${source === 'combined' ? '' : 'AND source = ?'}
    )
    SELECT 
      term,
      SUM(count) as count,
      ROUND(SUM(count) * 100.0 / (SELECT total FROM totals), 2) as percentage
    FROM hourly_counts
    WHERE bucket_start >= ? AND bucket_start <= ? ${sourceFilter}
    GROUP BY term
    ORDER BY count DESC
    LIMIT 50
  `;
  
  // Adjust params for the CTE + main query
  const fullParams = source === 'combined' 
    ? [startDate, endDate, startDate, endDate]
    : [startDate, endDate, source, startDate, endDate, source];
  
  const stmt = database.prepare(query);
  return stmt.all(...fullParams) as TreemapNode[];
}

export function getCollocations(
  term: string,
  source: Source | 'combined',
  limit = 20
): Collocation[] {
  const database = getDatabase();
  
  const isAll = term === 'all';
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const termFilter = isAll ? '' : 'AND term = ?';
  
  let params: unknown[];
  if (isAll) {
    params = source === 'combined' ? [limit] : [source, limit];
  } else {
    params = source === 'combined' ? [term, limit] : [term, source, limit];
  }
  
  const query = `
    SELECT ${isAll ? "'all' as term" : 'term'}, nearby_term as nearbyTerm, SUM(count) as count, 
           ${source === 'combined' ? "'combined'" : 'source'} as source
    FROM collocations
    WHERE 1=1 ${termFilter} ${sourceFilter}
    GROUP BY nearby_term
    ORDER BY count DESC
    LIMIT ?
  `;
  
  const stmt = database.prepare(query);
  return stmt.all(...params) as Collocation[];
}

export function getTopTerms(
  source: Source | 'combined',
  hours = 24,
  limit = 10
): Array<{ term: string; count: number }> {
  const database = getDatabase();
  
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const params = source === 'combined' ? [hours, limit] : [source, hours, limit];
  
  const query = `
    SELECT term, SUM(count) as count
    FROM hourly_counts
    WHERE bucket_start >= datetime('now', '-' || ? || ' hours') ${sourceFilter}
    GROUP BY term
    ORDER BY count DESC
    LIMIT ?
  `;
  
  const stmt = database.prepare(query);
  return stmt.all(...params) as Array<{ term: string; count: number }>;
}

export function detectSpikes(
  source: Source | 'combined',
  threshold = 2.0
): Spike[] {
  const database = getDatabase();
  
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const params = source === 'combined' ? [] : [source];
  
  // Compare last hour to 7-day average for same hour
  const query = `
    WITH recent AS (
      SELECT term, SUM(count) as current_count
      FROM hourly_counts
      WHERE bucket_start >= datetime('now', '-1 hour') ${sourceFilter}
      GROUP BY term
    ),
    baseline AS (
      SELECT term, AVG(count) as avg_count
      FROM hourly_counts
      WHERE bucket_start >= datetime('now', '-7 days')
        AND bucket_start < datetime('now', '-1 hour')
        ${sourceFilter}
      GROUP BY term
    )
    SELECT 
      r.term,
      '${source}' as source,
      datetime('now') as timestamp,
      r.current_count as currentRate,
      COALESCE(b.avg_count, 1) as baselineRate,
      ROUND(r.current_count * 1.0 / COALESCE(b.avg_count, 1), 2) as multiplier
    FROM recent r
    LEFT JOIN baseline b ON r.term = b.term
    WHERE r.current_count * 1.0 / COALESCE(b.avg_count, 1) >= ?
    ORDER BY multiplier DESC
    LIMIT 10
  `;
  
  const stmt = database.prepare(query);
  return stmt.all(...params, threshold) as Spike[];
}

export function getNewsEvents(
  startDate: string,
  endDate: string
): NewsEvent[] {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    SELECT timestamp, headline, source, url
    FROM news_events
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
    LIMIT 50
  `);
  
  return stmt.all(startDate, endDate) as NewsEvent[];
}

export function getTotalCounts(
  source: Source | 'combined',
  startDate: string,
  endDate: string
): number {
  const database = getDatabase();
  
  const sourceFilter = source === 'combined' ? '' : 'AND source = ?';
  const params = source === 'combined' ? [startDate, endDate] : [source, startDate, endDate];
  
  const query = `
    SELECT COALESCE(SUM(count), 0) as total
    FROM hourly_counts
    WHERE bucket_start >= ? AND bucket_start <= ? ${sourceFilter}
  `;
  
  const stmt = database.prepare(query);
  const result = stmt.get(...params) as { total: number };
  return result.total;
}
