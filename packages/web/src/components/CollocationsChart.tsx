// ============================================
// COLLOCATIONS / CO-OCCURRENCE COMPONENT
// ============================================

import { useCollocations } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { Network } from 'lucide-react';

interface CollocationsChartProps {
  term: string;
  source: SourceFilter;
}

export function CollocationsChart({ term, source }: CollocationsChartProps) {
  const { data, isLoading, error } = useCollocations(term, source, 15);
  
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
  
  if (data.length === 0) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="text-[var(--muted)]">No collocation data yet</div>
      </div>
    );
  }
  
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-profane-400" />
        <h3 className="text-lg font-semibold">
          {term === 'all' ? 'Common nearby words' : `Words near "${term}"`}
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {data.map((collocation) => {
          const intensity = collocation.count / maxCount;
          const fontSize = 12 + intensity * 12; // 12-24px
          const opacity = 0.5 + intensity * 0.5; // 0.5-1
          
          return (
            <span
              key={collocation.nearbyTerm}
              className="px-3 py-1 bg-[#262626] rounded-full hover:bg-[#363636] transition-colors cursor-default"
              style={{ 
                fontSize: `${fontSize}px`,
                opacity,
              }}
              title={`${collocation.count} co-occurrences`}
            >
              {collocation.nearbyTerm}
            </span>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-[var(--muted)]">
        Larger = more frequent co-occurrence
      </div>
    </div>
  );
}
