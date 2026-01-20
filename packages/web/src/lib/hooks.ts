// ============================================
// REACT QUERY HOOKS
// ============================================

import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { SourceFilter } from './api';

export function useStats(source: SourceFilter = 'combined') {
  return useQuery({
    queryKey: ['stats', source],
    queryFn: () => api.getStats(source),
  });
}

export function useTimeSeries(term: string, source: SourceFilter = 'combined') {
  return useQuery({
    queryKey: ['timeseries', term, source],
    queryFn: () => api.getTimeSeries(term, source),
    enabled: !!term,
  });
}

export function useHeatmap(term: string, source: SourceFilter = 'combined', days = 30) {
  return useQuery({
    queryKey: ['heatmap', term, source, days],
    queryFn: () => api.getHeatmap(term, source, days),
    enabled: !!term,
  });
}

export function useTreemap(source: SourceFilter = 'combined') {
  return useQuery({
    queryKey: ['treemap', source],
    queryFn: () => api.getTreemap(source),
  });
}

export function useCollocations(term: string, source: SourceFilter = 'combined', limit = 20) {
  return useQuery({
    queryKey: ['collocations', term, source, limit],
    queryFn: () => api.getCollocations(term, source, limit),
    enabled: !!term,
  });
}

export function useSpikes(source: SourceFilter = 'combined', threshold = 2.0) {
  return useQuery({
    queryKey: ['spikes', source, threshold],
    queryFn: () => api.getSpikes(source, threshold),
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
  });
}

export function useLexicon() {
  return useQuery({
    queryKey: ['lexicon'],
    queryFn: () => api.getLexicon(),
    staleTime: Infinity, // Lexicon doesn't change
  });
}
