// ============================================
// API CLIENT
// ============================================

import type { 
  ApiResponse, 
  DashboardStats, 
  TimeSeriesPoint, 
  Spike,
  HeatmapCell,
  TreemapNode,
  Collocation,
  NewsEvent,
  Source 
} from '@fuckometer/shared';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const json = await response.json() as ApiResponse<T>;
  
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Unknown API error');
  }
  
  return json.data;
}

export type SourceFilter = Source | 'combined';

// ============================================
// API FUNCTIONS
// ============================================

export async function getStats(source: SourceFilter = 'combined'): Promise<DashboardStats> {
  return fetchApi<DashboardStats>(`/stats?source=${source}`);
}

export async function getTimeSeries(
  term: string, 
  source: SourceFilter = 'combined'
): Promise<{ term: string; source: SourceFilter; points: TimeSeriesPoint[]; spikes: Spike[] }> {
  return fetchApi(`/timeseries/${encodeURIComponent(term)}?source=${source}`);
}

export async function getHeatmap(
  term: string, 
  source: SourceFilter = 'combined',
  days = 30
): Promise<HeatmapCell[]> {
  return fetchApi(`/heatmap/${encodeURIComponent(term)}?source=${source}&days=${days}`);
}

export async function getTreemap(source: SourceFilter = 'combined'): Promise<TreemapNode[]> {
  return fetchApi(`/treemap?source=${source}`);
}

export async function getCollocations(
  term: string, 
  source: SourceFilter = 'combined',
  limit = 20
): Promise<Collocation[]> {
  return fetchApi(`/collocations/${encodeURIComponent(term)}?source=${source}&limit=${limit}`);
}

export async function getSpikes(
  source: SourceFilter = 'combined',
  threshold = 2.0
): Promise<Spike[]> {
  return fetchApi(`/spikes?source=${source}&threshold=${threshold}`);
}

export async function getEvents(): Promise<NewsEvent[]> {
  return fetchApi('/events');
}

export async function getLexicon(): Promise<Array<{ term: string; severity: number; category: string }>> {
  return fetchApi('/lexicon');
}
