// ============================================
// JOB SCHEDULER
// ============================================

import cron from 'node-cron';
import { ingestGdelt } from './gdelt.js';
import { ingestMastodon } from './mastodon.js';

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
  // (respects rate limits internally)
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Running Mastodon ingestion');
    await ingestMastodon();
  });
  
  console.log('[Scheduler] Jobs scheduled:');
  console.log('  - GDELT: hourly at :05');
  console.log('  - Mastodon: every 10 minutes');
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
  ]);
  
  console.log('[Scheduler] Initial ingestion complete');
}
