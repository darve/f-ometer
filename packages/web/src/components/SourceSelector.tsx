// ============================================
// SOURCE FILTER COMPONENT
// ============================================

import type { SourceFilter } from '@/lib/api';
import { Database, Globe, Layers, MessageSquare, Cloud, Play } from 'lucide-react';

interface SourceSelectorProps {
  value: SourceFilter;
  onChange: (source: SourceFilter) => void;
}

const sources: Array<{ value: SourceFilter; label: string; icon: React.ReactNode }> = [
  { value: 'combined', label: 'All Sources', icon: <Layers className="w-4 h-4" /> },
  { value: 'gdelt', label: 'GDELT News', icon: <Globe className="w-4 h-4" /> },
  { value: 'mastodon', label: 'Mastodon', icon: <Database className="w-4 h-4" /> },
  { value: 'hackernews', label: 'Hacker News', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'bluesky', label: 'Bluesky', icon: <Cloud className="w-4 h-4" /> },
  { value: 'youtube', label: 'YouTube', icon: <Play className="w-4 h-4" /> },
];

export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {sources.map((source) => (
        <button
          key={source.value}
          onClick={() => onChange(source.value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${value === source.value 
              ? 'bg-profane-500/20 text-profane-400 border border-profane-500/30' 
              : 'bg-[#171717] text-[var(--muted)] border border-transparent hover:bg-[#222]'
            }
          `}
        >
          {source.icon}
          {source.label}
        </button>
      ))}
    </div>
  );
}
