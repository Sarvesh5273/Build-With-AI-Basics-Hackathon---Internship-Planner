import { useId, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, Target, X } from 'lucide-react';
import { rank, topicMatch } from '../../shared/rank';
import type { Planner } from '../lib/usePlanner';
import { ConfirmDialog } from '../planner-components/ConfirmDialog';
import { ListingCard } from '../planner-components/ListingCard';
import { RunStatus } from '../planner-components/RunStatus';
import { deadlineState, deadlineTime, fundingState, isOfficial, newestTime, visaState } from '../planner-components/listing-facts';

type Mode = 'visible' | 'saved' | 'selected' | 'hidden' | 'all';

export function DiscoveryResults({ planner }: { planner: Planner }) {
  const { progress, toggle, update, run, busy } = planner;
  const id = useId();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'fit' | 'newest' | 'deadline'>('fit');
  const [track, setTrack] = useState('all');
  const [funding, setFunding] = useState('all');
  const [visa, setVisa] = useState('all');
  const [mode, setMode] = useState<Mode>('visible');
  const [source, setSource] = useState('all');
  const [minFit, setMinFit] = useState('0');
  const [deadline, setDeadline] = useState('all');
  const [showExcluded, setShowExcluded] = useState(false);
  const [showOffTopic, setShowOffTopic] = useState(false);
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');

  const ranked = useMemo(() => progress.listings.map(l => rank(l, progress.preferences)), [progress.listings, progress.preferences]);
  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const r = ranked.filter(l => {
      const hid = progress.hidden.includes(l.id);
      if (mode === 'visible' && hid) return false;
      if (mode === 'saved' && !progress.saved.includes(l.id)) return false;
      if (mode === 'selected' && !progress.selected.includes(l.id)) return false;
      if (mode === 'hidden' && !hid) return false;
      if (track !== 'all' && l.track !== track) return false;
      if (funding !== 'all' && fundingState(l) !== funding) return false;
      if (visa !== 'all' && visaState(l) !== visa) return false;
      if (source !== 'all' && (source === 'official') !== isOfficial(l)) return false;
      if (l.score < Number(minFit)) return false;
      if (deadline === 'notClosed' ? deadlineState(l) === 'closed' : deadline !== 'all' && deadlineState(l) !== deadline) return false;
      // Excluded by the student's own preferences: hidden unless asked for (targets are never filtered away from the basket).
      if (l.excluded && !showExcluded && mode !== 'selected') return false;
      if (topicMatch(l, progress.preferences) === false && !showOffTopic && mode !== 'selected') return false;
      if (kw && ![l.title, l.organization, ...l.facts.map(f => f.value)].join(' ').toLowerCase().includes(kw)) return false;
      return true;
    });
    const primary = (a: typeof r[number], b: typeof r[number]) => sort === 'fit' ? b.score - a.score : sort === 'newest' ? newestTime(b) - newestTime(a) : deadlineTime(a) - deadlineTime(b);
    // Ties: official sources first, then more corroborating sources.
    return r.sort((a, b) => primary(a, b) || Number(isOfficial(b)) - Number(isOfficial(a)) || b.sources.length - a.sources.length);
  }, [ranked, q, sort, track, funding, visa, source, minFit, deadline, showExcluded, showOffTopic, progress.preferences, mode, progress.hidden, progress.saved, progress.selected]);
  const excludedCount = ranked.filter(l => l.excluded && !progress.hidden.includes(l.id)).length;
  const otherCount = ranked.filter(l => !isOfficial(l)).length;
  const offTopicCount = ranked.filter(l => topicMatch(l, progress.preferences) === false && !progress.hidden.includes(l.id)).length;

  const selectedListings = ranked.filter(l => progress.selected.includes(l.id));
  const name = (lid: string) => ranked.find(l => l.id === lid)?.title ?? 'listing';
  const onToggle = (lid: string, list: 'selected' | 'saved' | 'hidden') => {
    const was = progress[list].includes(lid);
    if (!toggle(list, lid)) { setConflict(lid); return; }
    const verb = { selected: was ? 'Removed from targets' : 'Selected as target', saved: was ? 'Unsaved' : 'Saved', hidden: was ? 'Unhidden' : 'Hidden' }[list];
    setAnnounce(`${verb}: ${name(lid)}`);
  };
  const clear = () => { setQ(''); setTrack('all'); setFunding('all'); setVisa('all'); setMode('visible'); setSource('all'); setMinFit('0'); setDeadline('all'); setShowExcluded(true); setShowOffTopic(true); };
  const live = run ? ['queued', 'searching', 'reading', 'interpreting'].includes(run.status) : busy;

  const sel = (label: string, value: string, set: (v: string) => void, opts: [string, string][]) => (
    <div><label htmlFor={`${id}-${label}`}>{label}</label>
      <select id={`${id}-${label}`} value={value} onChange={e => set(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );

  return (
    <div>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 4 &middot; Discovery</p>
        <h1>Live <span className="hl">sourced</span> opportunities</h1>
        <p style={{ maxWidth: 760 }}>Read from public pages and interpreted automatically; every fact is quoted from its page. <strong>Official source</strong> means the organization's own page was corroborated.
          <strong> Other source · unverified</strong> means a third-party page (news, announcement or listing sites) that may be copied or outdated. Check quotes and links before relying on anything.
          The fit number compares listings to your preferences. It is not a chance of being accepted.</p>
        <button type="button" className="btn" onClick={() => update({ screen: 'preferences' })}><SlidersHorizontal size={18} aria-hidden />Edit preferences</button>
      </header>
      <div className="disc">
        <div style={{ minWidth: 0 }}>
          <RunStatus planner={planner} />
          <section className="card filters-wrap" data-open={open} style={{ marginTop: 18 }} aria-label="Filter results">
            <button type="button" className="btn panel-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
              <span className="row" style={{ gap: 8 }}><SlidersHorizontal size={18} aria-hidden />Filters and sort</span><ChevronDown size={18} aria-hidden />
            </button>
            <div className="filters">
              <div className="wide"><label htmlFor={`${id}-q`}>Search within results</label>
                <div style={{ position: 'relative' }}>
                  <input id={`${id}-q`} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Title, organization, facts" style={{ paddingLeft: 38 }} />
                  <Search size={18} aria-hidden style={{ position: 'absolute', left: 12, top: 13 }} />
                </div></div>
              {sel('Sort', sort, v => setSort(v as typeof sort), [['fit', 'Best fit'], ['newest', 'Newest source'], ['deadline', 'Earliest deadline']])}
              {sel('Show', mode, v => setMode(v as Mode), [['visible', 'Not hidden'], ['saved', 'Saved'], ['selected', 'Selected'], ['hidden', 'Hidden only'], ['all', 'All incl. hidden']])}
              {sel('Track', track, setTrack, [['all', 'Any track'], ['Research', 'Research'], ['Company', 'Company']])}
              {sel('Funding', funding, setFunding, [['all', 'Any'], ['fullyFunded', 'Stated fully funded'], ['other', 'Other stated'], ['unknown', 'Unknown']])}
              {sel('Visa', visa, setVisa, [['all', 'Any'], ['supported', 'Supported'], ['unsupported', 'Not supported'], ['unknown', 'Unknown']])}
              {sel('Source', source, setSource, [['all', 'Any source'], ['official', 'Official only'], ['other', 'Other sources only']])}
              {sel('Minimum fit', minFit, setMinFit, [['0', 'Any fit'], ['25', '25+'], ['50', '50+'], ['75', '75+']])}
              {sel('Deadline', deadline, setDeadline, [['all', 'Any'], ['notClosed', 'Not closed'], ['upcoming', 'Upcoming date'], ['rolling', 'Rolling'], ['unknown', 'Not stated']])}
              <div className="check-filter"><label><input type="checkbox" checked={showExcluded} onChange={e => setShowExcluded(e.target.checked)} /> Show results my preferences exclude{excludedCount ? ` (${excludedCount})` : ''}</label></div>
              <div className="check-filter"><label><input type="checkbox" checked={showOffTopic} onChange={e => setShowOffTopic(e.target.checked)} /> Show results that mention none of my topics{offTopicCount ? ` (${offTopicCount})` : ''}</label></div>
            </div>
          </section>
          <p className="mono" role="status" style={{ marginTop: 14 }}>{shown.length} of {ranked.length} shown{otherCount ? ` · ${otherCount} from other sources` : ''}{progress.hidden.length ? ` · ${progress.hidden.length} hidden` : ''}{!showExcluded && excludedCount ? ` · ${excludedCount} excluded by your preferences` : ''}{!showOffTopic && offTopicCount ? ` · ${offTopicCount} off-topic hidden` : ''}</p>
          <div className="list">
            {ranked.length === 0 && live && [0, 1, 2].map(i => <div key={i} className="skel" aria-hidden />)}
            {ranked.length === 0 && !live && <div className="empty"><Search size={40} aria-hidden /><h3>No listings yet</h3>
              <p>{run?.status === 'failed' ? 'The search failed before any listing was confirmed. Retry above or adjust preferences.' : 'Nothing evidence-backed came back. Try broader topics or search more.'}</p></div>}
            {ranked.length > 0 && shown.length === 0 && <div className="empty"><SlidersHorizontal size={40} aria-hidden /><h3>No listings match these filters</h3>
              <p>Your targets are untouched.</p><button type="button" className="btn" onClick={clear}>Clear filters</button></div>}
            {shown.map(l => <ListingCard key={l.id} listing={l} selected={progress.selected.includes(l.id)} saved={progress.saved.includes(l.id)}
              hidden={progress.hidden.includes(l.id)} onToggle={list => onToggle(l.id, list)} />)}
          </div>
        </div>
        <aside className="card basket tape" aria-labelledby="basket-h">
          <h2 id="basket-h" className="row" style={{ gap: 8 }}><Target aria-hidden />Your targets</h2>
          {selectedListings.length === 0 ? <p className="muted">Nothing selected. Choose targets yourself; saving a listing does not select it.</p> : (
            <ul>{selectedListings.map(l => <li key={l.id}><span>{l.title}<br /><small className="muted">{l.organization}</small></span>
              <button type="button" className="btn small ghost" aria-label={`Remove ${l.title} from targets`} onClick={() => onToggle(l.id, 'selected')}><X size={18} /></button></li>)}</ul>)}
          <p className="hint" style={{ marginTop: 12 }}>Filters never remove targets. {progress.selected.length - selectedListings.length > 0 && `${progress.selected.length - selectedListings.length} selected item(s) are no longer in stored results.`}</p>
          <div className="upcoming-card" style={{ marginTop: 14 }}>
            <strong>Next: check eligibility</strong>
            <p className="hint">Only selected targets go on to eligibility, readiness and your roadmap. No eligibility is claimed until you add your details.</p>
            <button type="button" className="btn primary" style={{ width: '100%' }} disabled={!progress.selected.length} onClick={() => update({ screen: 'eligibility' })}>Check {progress.selected.length || ''} target{progress.selected.length === 1 ? '' : 's'}<ArrowRight size={18} aria-hidden /></button>
          </div>
        </aside>
      </div>
      <ConfirmDialog open={!!conflict} title="Hide a selected target?" confirmLabel="Remove selection and hide" danger
        onCancel={() => setConflict(null)}
        onConfirm={() => { if (conflict) { toggle('hidden', conflict, true); setAnnounce(`Removed from targets and hidden: ${name(conflict)}`); } setConflict(null); }}>
        <p><strong>{conflict && name(conflict)}</strong> is one of your targets. Hiding it will also remove it from your targets.</p>
      </ConfirmDialog>
    </div>
  );
}
