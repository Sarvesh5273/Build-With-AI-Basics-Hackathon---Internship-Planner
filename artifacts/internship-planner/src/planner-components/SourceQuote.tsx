import { ChevronRight, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

export function SourceQuote({ summary, quote, url, title, meta, compact }: {
  summary: ReactNode; quote: string; url?: string; title?: string; meta?: ReactNode; compact?: boolean;
}) {
  return (
    <details className={compact ? 'src compact' : 'src'}>
      <summary><ChevronRight className="chev" size={18} aria-hidden />{summary}</summary>
      <blockquote className="quote">&ldquo;{quote}&rdquo;</blockquote>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 6, overflowWrap: 'anywhere' }}>
        <ExternalLink size={16} aria-hidden />{title || url}<span className="sr-only"> (opens in new tab)</span></a>
        : <p className="muted">Source link unavailable for this excerpt.</p>}
      {meta && <div className="mono muted" style={{ marginTop: 6 }}>{meta}</div>}
    </details>
  );
}
