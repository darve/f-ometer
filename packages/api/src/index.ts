// ============================================
// FUCKOMETER API SERVER
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { api } from './routes/api.js';
import { startScheduler, runInitialIngestion } from './jobs/scheduler.js';
import { migrate } from './db/migrate.js';

// Load environment variables
config();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api', api);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

async function main() {
  // Run database migrations
  console.log('Initializing database...');
  migrate();
  
  // Start the server
  console.log(`Starting server on port ${port}...`);
  serve({
    fetch: app.fetch,
    port,
  });
  
  console.log(`🚀 Fuckometer API running at http://localhost:${port}`);
  
  // Run initial data ingestion (in background)
  if (process.env.NODE_ENV !== 'test') {
    runInitialIngestion().catch(console.error);
    
    // Start scheduled jobs
    startScheduler();
  }
}

main().catch(console.error);

export default app;
