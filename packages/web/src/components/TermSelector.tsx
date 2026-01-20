// ============================================
// TERM SELECTOR COMPONENT
// ============================================

import { useLexicon } from '@/lib/hooks';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface TermSelectorProps {
  value: string;
  onChange: (term: string) => void;
}

export function TermSelector({ value, onChange }: TermSelectorProps) {
  const { data: lexicon } = useLexicon();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredTerms = useMemo(() => {
    if (!lexicon) return [];
    if (!search) return lexicon.slice(0, 20);
    
    const lower = search.toLowerCase();
    return lexicon.filter(t => t.term.toLowerCase().includes(lower)).slice(0, 20);
  }, [lexicon, search]);
  
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'bg-yellow-500/20 text-yellow-400';
      case 2: return 'bg-orange-500/20 text-orange-400';
      case 3: return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  return (
    <div className="relative">
      <div 
        className="flex items-center gap-2 bg-[#171717] border border-[#262626] rounded-lg px-3 py-2 cursor-pointer hover:border-[#363636] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Search className="w-4 h-4 text-[var(--muted)]" />
        <span className={value ? 'text-white' : 'text-[var(--muted)]'}>
          {value === 'all' ? '🤬 All profanity' : value || 'Select a term...'}
        </span>
      </div>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-[#171717] border border-[#262626] rounded-lg shadow-xl z-20 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-[#262626]">
              <input
                type="text"
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm focus:outline-none focus:border-profane-500"
                autoFocus
              />
            </div>
            
            {/* Term list */}
            <div className="max-h-64 overflow-y-auto">
              {/* All profanity option */}
              {!search && (
                <button
                  onClick={() => {
                    onChange('all');
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#222] transition-colors border-b border-[#262626]
                    ${value === 'all' ? 'bg-profane-500/10' : ''}
                  `}
                >
                  <span className="font-medium">🤬 All profanity</span>
                  <span className="badge bg-profane-500/20 text-profane-400">aggregate</span>
                </button>
              )}
              
              {filteredTerms.map((term) => (
                <button
                  key={term.term}
                  onClick={() => {
                    onChange(term.term);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#222] transition-colors
                    ${value === term.term ? 'bg-profane-500/10' : ''}
                  `}
                >
                  <span className="font-medium">{term.term}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getSeverityColor(term.severity)}`}>
                      {term.severity === 1 ? 'mild' : term.severity === 2 ? 'moderate' : 'strong'}
                    </span>
                  </div>
                </button>
              ))}
              
              {filteredTerms.length === 0 && !search && (
                <div className="px-3 py-4 text-center text-[var(--muted)]">
                  No matching terms
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
