// ============================================
// STATS HEADER COMPONENT
// ============================================

import { useStats } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface StatsHeaderProps {
  source: SourceFilter;
}

export function StatsHeader({ source }: StatsHeaderProps) {
  const { data, isLoading, error } = useStats(source);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-8 bg-[#262626] rounded w-24 mb-2" />
            <div className="h-4 bg-[#262626] rounded w-16" />
          </div>
        ))}
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="card">
        <div className="text-red-400">Failed to load statistics</div>
      </div>
    );
  }
  
  const changeIcon = data.changePercent > 0 
    ? <TrendingUp className="w-4 h-4" />
    : data.changePercent < 0 
      ? <TrendingDown className="w-4 h-4" />
      : <Minus className="w-4 h-4" />;
  
  const changeBadgeClass = data.changePercent > 0 
    ? 'badge-up'
    : data.changePercent < 0 
      ? 'badge-down'
      : 'badge-neutral';
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total today */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-profane-400" />
          <span className="stat-label">Today</span>
        </div>
        <div className="stat-value text-profane-400">
          {data.totalCountToday.toLocaleString()}
        </div>
        <div className={`badge ${changeBadgeClass} mt-2`}>
          {changeIcon}
          <span className="ml-1">{Math.abs(data.changePercent)}% vs yesterday</span>
        </div>
      </div>
      
      {/* Top term */}
      <div className="card">
        <div className="stat-label mb-1">Top Term</div>
        <div className="stat-value">
          {data.topTerms[0]?.term || '-'}
        </div>
        <div className="text-sm text-[var(--muted)] mt-2">
          {data.topTerms[0]?.count.toLocaleString() || 0} occurrences
        </div>
      </div>
      
      {/* Active spikes */}
      <div className="card">
        <div className="stat-label mb-1">Active Spikes</div>
        <div className="stat-value text-amber-400">
          {data.latestSpikes.length}
        </div>
        <div className="text-sm text-[var(--muted)] mt-2">
          {data.latestSpikes.length > 0 
            ? `Highest: ${data.latestSpikes[0]?.multiplier.toFixed(1)}×`
            : 'All normal'
          }
        </div>
      </div>
      
      {/* Yesterday total */}
      <div className="card">
        <div className="stat-label mb-1">Yesterday</div>
        <div className="stat-value text-[var(--muted)]">
          {data.totalCountYesterday.toLocaleString()}
        </div>
        <div className="text-sm text-[var(--muted)] mt-2">
          24h total
        </div>
      </div>
    </div>
  );
}
