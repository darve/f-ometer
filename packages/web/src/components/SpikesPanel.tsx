// ============================================
// SPIKES PANEL COMPONENT
// ============================================

import { useSpikes, useEvents } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { AlertTriangle, Newspaper, TrendingUp } from 'lucide-react';

interface SpikesPanelProps {
  source: SourceFilter;
  onTermClick?: (term: string) => void;
}

export function SpikesPanel({ source, onTermClick }: SpikesPanelProps) {
  const { data: spikes, isLoading: spikesLoading } = useSpikes(source);
  const { data: events, isLoading: eventsLoading } = useEvents();
  
  const isLoading = spikesLoading || eventsLoading;
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold">Spike Alerts</h3>
      </div>
      
      {isLoading ? (
        <div className="text-[var(--muted)]">Loading...</div>
      ) : !spikes || spikes.length === 0 ? (
        <div className="text-[var(--muted)] text-sm">
          No unusual spikes detected in the last hour
        </div>
      ) : (
        <div className="space-y-3">
          {spikes.slice(0, 5).map((spike, i) => (
            <div 
              key={`${spike.term}-${i}`}
              className="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#222] transition-colors cursor-pointer"
              onClick={() => onTermClick?.(spike.term)}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-profane-400" />
                <span className="font-medium">{spike.term}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-semibold">
                  {spike.multiplier.toFixed(1)}×
                </span>
                <span className="text-xs text-[var(--muted)]">
                  baseline
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recent events section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-semibold text-[var(--muted)]">Recent News Events</h4>
        </div>
        
        {eventsLoading ? (
          <div className="text-[var(--muted)] text-sm">Loading...</div>
        ) : !events || events.length === 0 ? (
          <div className="text-[var(--muted)] text-sm">
            No recent events with profanity detected
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events.slice(0, 10).map((event, i) => (
              <div 
                key={i}
                className="text-sm p-2 bg-[#1a1a1a] rounded"
              >
                <div className="text-xs text-[var(--muted)] mb-1">
                  {new Date(event.timestamp).toLocaleString()} • {event.source}
                </div>
                <div className="line-clamp-2">
                  {event.url ? (
                    <a 
                      href={event.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      {event.headline}
                    </a>
                  ) : (
                    event.headline
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
