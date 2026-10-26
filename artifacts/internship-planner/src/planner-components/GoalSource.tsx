import type { ReactNode } from 'react';
import type { PreparedGoal } from '../../shared/planning';
import { SourceQuote } from './SourceQuote';

export function fmtDate(at: number | string | null | undefined, tz?: string) {
  if (at == null) return 'unknown';
  const d = typeof at === 'number' ? new Date(at) : new Date(at.length === 10 ? at + 'T00:00:00Z' : at);
  if (!Number.isFinite(+d)) return String(at);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(tz ? { timeZone: tz } : typeof at === 'string' && at.length === 10 ? { timeZone: 'UTC' } : {}) });
}

/** Quoted excerpt with link and honest freshness for a goal's source. */
export function GoalSource({ goal, sourceId, quote, summary }: { goal?: PreparedGoal; sourceId: string; quote: string; summary?: ReactNode }) {
  const src = goal?.listing.sources.find(s => s.id === sourceId) ?? goal?.listing.sources[0];
  const label = src?.official === false ? 'Unverified other-source quote' : 'Official quote';
  return <SourceQuote summary={summary ?? label} quote={quote} url={src?.url ?? goal?.listing.canonicalUrl} title={src?.title}
    meta={src ? <>{src.official === false ? 'Third-party page, not verified as official · ' : ''}Retrieved {fmtDate(src.fetchedAt)} &middot; {src.freshness} &middot; snapshot, not live-verified</> : 'Retrieval metadata unavailable'} />;
}
