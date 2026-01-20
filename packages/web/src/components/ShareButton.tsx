// ============================================
// SHARE BUTTON COMPONENT
// ============================================

import { Share2, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { SourceFilter } from '@/lib/api';

interface ShareButtonProps {
  term: string;
  source: SourceFilter;
}

export function ShareButton({ term, source }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  
  const handleShare = async () => {
    const params = new URLSearchParams();
    if (term) params.set('term', term);
    if (source !== 'combined') params.set('source', source);
    
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-2 bg-[#171717] border border-[#262626] rounded-lg text-sm hover:bg-[#222] transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
