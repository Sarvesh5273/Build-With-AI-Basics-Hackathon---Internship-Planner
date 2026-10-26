import type { Fact, Listing } from '../../shared/schemas';
import { normalize } from '../../shared/rank';

export const factsOf = (l: Listing, kind: Fact['kind']) => l.facts.filter(f => f.kind === kind);
export function fundingState(l: Listing): 'fullyFunded' | 'other' | 'unknown' {
  const v = factsOf(l, 'funding').map(f => normalize(f.value));
  if (!v.length || v.includes('unknown')) return 'unknown';
  return v.includes('fullyfunded') ? 'fullyFunded' : 'other';
}
export function visaState(l: Listing): 'supported' | 'unsupported' | 'unknown' {
  const v = factsOf(l, 'visa').map(f => normalize(f.value));
  if (v.includes('supported')) return 'supported';
  if (v.includes('unsupported')) return 'unsupported';
  return 'unknown';
}
export function deadlineTime(l: Listing): number {
  const times = factsOf(l, 'deadline').map(f => f.due?.at ? Date.parse(f.due.at) : NaN).filter(n => !Number.isNaN(n));
  return times.length ? Math.min(...times) : Infinity;
}
export function newestTime(l: Listing): number {
  const t = l.sources.map(s => Date.parse(s.fetchedAt)).filter(n => !Number.isNaN(n));
  return t.length ? Math.max(...t) : 0;
}
/** True when at least one source was corroborated as the organization's own page. */
export const isOfficial = (l: Listing) => l.sources.some(s => s.official !== false);
export function deadlineState(l: Listing, now = Date.now()): 'closed' | 'upcoming' | 'rolling' | 'unknown' {
  const cycle = factsOf(l, 'cycle').map(f => normalize(f.value));
  const dues = factsOf(l, 'deadline').map(f => f.due).filter(Boolean);
  const times = dues.map(d => d?.at ? Date.parse(d.at) : NaN).filter(n => !Number.isNaN(n));
  if (cycle.includes('closed') || (times.length && times.every(t => t < now))) return 'closed';
  if (times.some(t => t >= now)) return 'upcoming';
  if (cycle.includes('rolling') || dues.some(d => d?.kind === 'rolling')) return 'rolling';
  return 'unknown';
}
export const sourceFor = (l: Listing, id: string) => l.sources.find(s => s.id === id);
export const fmtDate = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
