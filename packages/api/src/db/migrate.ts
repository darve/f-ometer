// ============================================
// DATABASE SETUP AND MIGRATIONS
// ============================================

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/fuckometer.db');

export function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function migrate(): void {
  const db = getDb();
  
  console.log('Running migrations...');
  
  // Check if we need to update the source constraint
  // This handles the migration from old 2-source to new 5-source schema
  const hasOldConstraint = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='hourly_counts' 
    AND sql LIKE '%gdelt%mastodon%' 
    AND sql NOT LIKE '%hackernews%'
  `).get();
  
  if (hasOldConstraint) {
    console.log('Updating source constraints for new data sources...');
    
    // SQLite doesn't support ALTER CONSTRAINT, so we recreate tables
    db.exec(`
      -- Disable foreign keys temporarily
      PRAGMA foreign_keys = OFF;
      
      -- Recreate hourly_counts
      CREATE TABLE IF NOT EXISTS hourly_counts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('gdelt', 'mastodon', 'hackernews', 'bluesky', 'youtube')),
        bucket_start TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        anger_count INTEGER NOT NULL DEFAULT 0,
        humor_count INTEGER NOT NULL DEFAULT 0,
        emphasis_count INTEGER NOT NULL DEFAULT 0,
        quote_count INTEGER NOT NULL DEFAULT 0,
        unknown_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(term, source, bucket_start)
      );
      
      INSERT INTO hourly_counts_new SELECT * FROM hourly_counts;
      DROP TABLE hourly_counts;
      ALTER TABLE hourly_counts_new RENAME TO hourly_counts;
      
      CREATE INDEX IF NOT EXISTS idx_hourly_counts_term ON hourly_counts(term);
      CREATE INDEX IF NOT EXISTS idx_hourly_counts_source ON hourly_counts(source);
      CREATE INDEX IF NOT EXISTS idx_hourly_counts_bucket ON hourly_counts(bucket_start);
      
      -- Recreate collocations
      CREATE TABLE IF NOT EXISTS collocations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        nearby_term TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('gdelt', 'mastodon', 'hackernews', 'bluesky', 'youtube')),
        count INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(term, nearby_term, source)
      );
      
      INSERT INTO collocations_new SELECT * FROM collocations;
      DROP TABLE collocations;
      ALTER TABLE collocations_new RENAME TO collocations;
      
      CREATE INDEX IF NOT EXISTS idx_collocations_term ON collocations(term);
      
      PRAGMA foreign_keys = ON;
    `);
    
    console.log('Source constraints updated!');
  }
  
  // Create hourly_counts table (with new sources)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hourly_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('gdelt', 'mastodon', 'hackernews', 'bluesky', 'youtube')),
      bucket_start TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      anger_count INTEGER NOT NULL DEFAULT 0,
      humor_count INTEGER NOT NULL DEFAULT 0,
      emphasis_count INTEGER NOT NULL DEFAULT 0,
      quote_count INTEGER NOT NULL DEFAULT 0,
      unknown_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(term, source, bucket_start)
    );
    
    CREATE INDEX IF NOT EXISTS idx_hourly_counts_term ON hourly_counts(term);
    CREATE INDEX IF NOT EXISTS idx_hourly_counts_source ON hourly_counts(source);
    CREATE INDEX IF NOT EXISTS idx_hourly_counts_bucket ON hourly_counts(bucket_start);
  `);
  
  // Create collocations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      nearby_term TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('gdelt', 'mastodon', 'hackernews', 'bluesky', 'youtube')),
      count INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(term, nearby_term, source)
    );
    
    CREATE INDEX IF NOT EXISTS idx_collocations_term ON collocations(term);
  `);
  
  // Create news_events table (for spike correlation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      headline TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_news_events_timestamp ON news_events(timestamp);
  `);
  
  // Create ingestion_log table (track last ingestion times)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingestion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      items_processed INTEGER DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
      error_message TEXT
    );
  `);
  
  console.log('Migrations complete!');
  db.close();
}

// Run migrations if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
}
