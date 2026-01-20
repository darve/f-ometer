// ============================================
// API ROUTES
// ============================================

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getTimeSeries,
  getHeatmap,
  getTreemap,
  getCollocations,
  getTopTerms,
  detectSpikes,
  getNewsEvents,
  getTotalCounts,
} from '../db/queries.js';
import type { ApiResponse, Source, DashboardStats } from '@fuckometer/shared';
import { SAFE_LEXICON } from '@fuckometer/shared';

export const api = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const sourceSchema = z.enum(['gdelt', 'mastodon', 'combined']).default('combined');
const dateSchema = z.string().datetime().optional();

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/stats
 * Dashboard summary statistics
 */
api.get('/stats', (c) => {
  const source = sourceSchema.parse(c.req.query('source'));
  
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  
  const todayCount = getTotalCounts(source, todayStart.toISOString(), now.toISOString());
  const yesterdayCount = getTotalCounts(source, yesterdayStart.toISOString(), todayStart.toISOString());
  
  const changePercent = yesterdayCount > 0 
    ? Math.round((todayCount - yesterdayCount) / yesterdayCount * 100)
    : 0;
  
  const topTerms = getTopTerms(source, 24, 10);
  const latestSpikes = detectSpikes(source, 2.0);
  
  const stats: DashboardStats = {
    totalCountToday: todayCount,
    totalCountYesterday: yesterdayCount,
    changePercent,
    topTerms,
    latestSpikes,
  };
  
  const response: ApiResponse<DashboardStats> = {
    success: true,
    data: stats,
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/timeseries/:term
 * Time series data for a specific term
 */
api.get('/timeseries/:term', (c) => {
  const term = c.req.param('term');
  const source = sourceSchema.parse(c.req.query('source'));
  
  // Default to last 7 days
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);
  
  const start = c.req.query('start') || startDate.toISOString();
  const end = c.req.query('end') || now.toISOString();
  
  const points = getTimeSeries(term, source, start, end);
  const spikes = detectSpikes(source, 2.0).filter(s => s.term === term);
  
  const response: ApiResponse<{ term: string; source: Source | 'combined'; points: typeof points; spikes: typeof spikes }> = {
    success: true,
    data: { term, source, points, spikes },
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/heatmap/:term
 * Hour-of-day × day-of-week heatmap
 */
api.get('/heatmap/:term', (c) => {
  const term = c.req.param('term');
  const source = sourceSchema.parse(c.req.query('source'));
  const days = parseInt(c.req.query('days') || '30', 10);
  
  const cells = getHeatmap(term, source, days);
  
  const response: ApiResponse<typeof cells> = {
    success: true,
    data: cells,
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/treemap
 * Share-of-total profanity treemap
 */
api.get('/treemap', (c) => {
  const source = sourceSchema.parse(c.req.query('source'));
  
  // Default to last 24 hours
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  
  const start = c.req.query('start') || startDate.toISOString();
  const end = c.req.query('end') || now.toISOString();
  
  const nodes = getTreemap(source, start, end);
  
  const response: ApiResponse<typeof nodes> = {
    success: true,
    data: nodes,
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/collocations/:term
 * Words that appear near a term
 */
api.get('/collocations/:term', (c) => {
  const term = c.req.param('term');
  const source = sourceSchema.parse(c.req.query('source'));
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  const collocations = getCollocations(term, source, limit);
  
  const response: ApiResponse<typeof collocations> = {
    success: true,
    data: collocations,
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/spikes
 * Current spike alerts
 */
api.get('/spikes', (c) => {
  const source = sourceSchema.parse(c.req.query('source'));
  const threshold = parseFloat(c.req.query('threshold') || '2.0');
  
  const spikes = detectSpikes(source, threshold);
  
  const response: ApiResponse<typeof spikes> = {
    success: true,
    data: spikes,
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/events
 * News events for spike correlation
 */
api.get('/events', (c) => {
  // Default to last 24 hours
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  
  const start = c.req.query('start') || startDate.toISOString();
  const end = c.req.query('end') || now.toISOString();
  
  const events = getNewsEvents(start, end);
  
  const response: ApiResponse<typeof events> = {
    success: true,
    data: events,
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'gdelt',
    },
  };
  
  return c.json(response);
});

/**
 * GET /api/lexicon
 * Available terms in the lexicon (safe only)
 */
api.get('/lexicon', (c) => {
  const terms = SAFE_LEXICON.map(e => ({
    term: e.term,
    severity: e.severity,
    category: e.category,
  }));
  
  const response: ApiResponse<typeof terms> = {
    success: true,
    data: terms,
  };
  
  return c.json(response);
});
