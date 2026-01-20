// ============================================
// HEATMAP COMPONENT (Hour × Day)
// ============================================

import { useHeatmap } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { Calendar } from 'lucide-react';

interface HeatmapChartProps {
  term: string;
  source: SourceFilter;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value: number, max: number): string {
  if (value === 0) return '#171717';
  const intensity = value / max;
  
  if (intensity < 0.25) return '#7f1d1d';
  if (intensity < 0.5) return '#991b1b';
  if (intensity < 0.75) return '#dc2626';
  return '#ef4444';
}

export function HeatmapChart({ term, source }: HeatmapChartProps) {
  const { data, isLoading, error } = useHeatmap(term, source);
  
  if (isLoading) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="text-red-400">Failed to load data</div>
      </div>
    );
  }
  
  // Create a grid map
  const grid: Record<string, number> = {};
  let maxValue = 1;
  
  for (const cell of data) {
    const key = `${cell.dayOfWeek}-${cell.hourOfDay}`;
    grid[key] = cell.count;
    if (cell.count > maxValue) maxValue = cell.count;
  }
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-profane-400" />
        <h3 className="text-lg font-semibold">
          "{term}" by time of day
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {HOURS.filter(h => h % 3 === 0).map(hour => (
              <div 
                key={hour} 
                className="text-xs text-[var(--muted)]"
                style={{ width: '48px' }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          {/* Grid */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center">
              <div className="w-12 text-xs text-[var(--muted)]">{day}</div>
              <div className="flex gap-0.5">
                {HOURS.map(hour => {
                  const key = `${dayIndex}-${hour}`;
                  const value = grid[key] || 0;
                  
                  return (
                    <div
                      key={hour}
                      className="w-5 h-5 rounded-sm transition-colors hover:ring-1 hover:ring-white/30"
                      style={{ backgroundColor: getColor(value, maxValue) }}
                      title={`${day} ${hour}:00 - ${value} occurrences`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 ml-12">
            <span className="text-xs text-[var(--muted)]">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: getColor(intensity * maxValue, maxValue) }}
              />
            ))}
            <span className="text-xs text-[var(--muted)]">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
