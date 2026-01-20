// ============================================
// MAIN APP COMPONENT
// ============================================

import { useState, useEffect } from 'react';
import type { SourceFilter } from '@/lib/api';
import { StatsHeader } from '@/components/StatsHeader';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { HeatmapChart } from '@/components/HeatmapChart';
import { TreemapChart } from '@/components/TreemapChart';
import { CollocationsChart } from '@/components/CollocationsChart';
import { SpikesPanel } from '@/components/SpikesPanel';
import { SourceSelector } from '@/components/SourceSelector';
import { TermSelector } from '@/components/TermSelector';
import { ShareButton } from '@/components/ShareButton';
import { BarChart3, Github } from 'lucide-react';

function App() {
  // Parse URL params for initial state
  const params = new URLSearchParams(window.location.search);
  const initialTerm = params.get('term') || 'fuck';
  const initialSource = (params.get('source') as SourceFilter) || 'combined';
  
  const [selectedTerm, setSelectedTerm] = useState(initialTerm);
  const [selectedSource, setSelectedSource] = useState<SourceFilter>(initialSource);
  
  // Update URL when selection changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTerm && selectedTerm !== 'fuck') params.set('term', selectedTerm);
    if (selectedSource !== 'combined') params.set('source', selectedSource);
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, [selectedTerm, selectedSource]);
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#262626] sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-profane-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Fuckometer</h1>
                <p className="text-xs text-[var(--muted)]">Real-time profanity trends</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <TermSelector value={selectedTerm} onChange={setSelectedTerm} />
              <SourceSelector value={selectedSource} onChange={setSelectedSource} />
              <ShareButton term={selectedTerm} source={selectedSource} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <section className="mb-6">
          <StatsHeader source={selectedSource} />
        </section>
        
        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - main charts */}
          <div className="lg:col-span-2 space-y-6">
            <TimeSeriesChart term={selectedTerm} source={selectedSource} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeatmapChart term={selectedTerm} source={selectedSource} />
              <CollocationsChart term={selectedTerm} source={selectedSource} />
            </div>
            
            <TreemapChart 
              source={selectedSource} 
              onTermClick={setSelectedTerm}
            />
          </div>
          
          {/* Right column - spikes panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <SpikesPanel 
                source={selectedSource} 
                onTermClick={setSelectedTerm}
              />
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[#262626] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--muted)]">
            <div>
              <p>
                Data from{' '}
                <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  GDELT
                </a>
                {' '}and{' '}
                <a href="https://mastodon.social/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  Mastodon
                </a>
              </p>
              <p className="text-xs mt-1">
                Aggregate analysis only • No individual users identified • No raw content stored
              </p>
            </div>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
