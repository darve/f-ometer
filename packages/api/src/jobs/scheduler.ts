// ============================================
// JOB SCHEDULER
// ============================================

import cron from 'node-cron';
import { ingestGdelt } from './gdelt.js';
import { ingestMastodon } from './mastodon.js';
import { ingestHackerNews } from './hackernews.js';
import { ingestBluesky } from './bluesky.js';
import { ingestYouTube } from './youtube.js';

/**
 * Start all scheduled jobs
 */
export function startScheduler(): void {
  console.log('[Scheduler] Starting scheduled jobs...');
  
  // GDELT ingestion: every hour at :05
  cron.schedule('5 * * * *', async () => {
    console.log('[Scheduler] Running GDELT ingestion');
    await ingestGdelt();
  });
  
  // Mastodon ingestion: every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Running Mastodon ingestion');
    await ingestMastodon();
  });
  
  // HackerNews ingestion: every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Running HackerNews ingestion');
    await ingestHackerNews();
  });
  
  // Bluesky ingestion: every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Running Bluesky ingestion');
    await ingestBluesky();
  });
  
  // YouTube ingestion: every 15 minutes (higher API quota usage)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Running YouTube ingestion');
    await ingestYouTube();
  });
  
  console.log('[Scheduler] Jobs scheduled:');
  console.log('  - GDELT: hourly at :05');
  console.log('  - Mastodon: every 10 minutes');
  console.log('  - HackerNews: every 10 minutes');
  console.log('  - Bluesky: every 10 minutes');
  console.log('  - YouTube: every 15 minutes');
}

/**
 * Run initial ingestion on startup
 */
export async function runInitialIngestion(): Promise<void> {
  console.log('[Scheduler] Running initial ingestion...');
  
  // Run all in parallel
  await Promise.all([
    ingestGdelt().catch(e => console.error('[GDELT] Initial ingestion failed:', e)),
    ingestMastodon().catch(e => console.error('[Mastodon] Initial ingestion failed:', e)),
    ingestHackerNews().catch(e => console.error('[HackerNews] Initial ingestion failed:', e)),
    ingestBluesky().catch(e => console.error('[Bluesky] Initial ingestion failed:', e)),
    ingestYouTube().catch(e => console.error('[YouTube] Initial ingestion failed:', e)),
  ]);
  
  console.log('[Scheduler] Initial ingestion complete');
}
