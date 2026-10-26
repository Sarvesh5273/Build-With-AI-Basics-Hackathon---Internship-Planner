import { useId, useState } from 'react';
import { ArrowLeft, Search, ShieldAlert } from 'lucide-react';
import type { Preferences } from '../../shared/schemas';
import type { Planner } from '../lib/usePlanner';
import { ListEditor } from '../planner-components/ListEditor';

export function SearchPreferences({ planner }: { planner: Planner }) {
  const { progress, update, search, busy, configuration, direction: d } = planner;
  const p = progress.preferences;
  const set = (patch: Partial<Preferences>) => update({ preferences: { ...p, ...patch } });
  const [ack, setAck] = useState(false);
  const cid = useId();
  const inferredTopics = d.topics.map(t => t.name);
  const topicsInferred = p.topics.length > 0 && p.topics.every(t => inferredTopics.includes(t));
  const toggleTrack = (t: 'Research' | 'Company') => {
    const has = p.tracks.includes(t);
    if (has && p.tracks.length === 1) return;
    set({ tracks: has ? p.tracks.filter(x => x !== t) : [...p.tracks, t] });
  };
  const unavailable = configuration && (!configuration.tinyfish || !configuration.groq);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 3 of 4 &middot; Preferences</p>
        <h1>Tell the search <span className="hl">what matters</span></h1>
        <p style={{ maxWidth: 720 }}>Everything here is yours to change, including what the taste test suggested. Leaving something empty means it will not count for or against a listing.</p>
      </header>
      <form className="card prefs" onSubmit={e => { e.preventDefault(); if (ack) void search(); }}>
        <div className="wide">
          <ListEditor label="Topics or roles" values={p.topics} onChange={v => set({ topics: v })} badge={topicsInferred ? 'suggested' : undefined}
            placeholder="e.g. robotics, frontend" hint="Suggested from your direction; edit freely." />
        </div>
        <ListEditor label="Locations" values={p.locations} onChange={v => set({ locations: v })} placeholder="e.g. Japan, Lausanne" />
        <ListEditor label="Preferred organizations" values={p.organizations} onChange={v => set({ organizations: v })} placeholder="e.g. OIST"
          hint="Searched first; others are not excluded." />
        <fieldset>
          <legend>Tracks</legend>
          <div className="seg">
            {(['Research', 'Company'] as const).map(t => (
              <button key={t} type="button" aria-pressed={p.tracks.includes(t)} onClick={() => toggleTrack(t)}>{t}</button>
            ))}
          </div>
          <p className="hint">At least one stays on.</p>
        </fieldset>
        <fieldset>
          <legend>Remote</legend>
          <div className="seg">
            {([['any', 'Any'], ['remote', 'Remote'], ['onsite', 'On-site']] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={p.remote === v} onClick={() => set({ remote: v })}>{l}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Funding</legend>
          <div className="seg">
            <button type="button" aria-pressed={p.funding === 'fullyFunded'} onClick={() => set({ funding: 'fullyFunded' })}>Fully funded focus</button>
            <button type="button" aria-pressed={p.funding === 'any'} onClick={() => set({ funding: 'any' })}>Broaden to any</button>
          </div>
          <p className="hint">Default. Unknown funding never counts as a match.</p>
        </fieldset>
        <div>
          <label htmlFor={`${cid}-cit`}>Citizenship</label>
          <input id={`${cid}-cit`} type="text" maxLength={60} value={p.citizenship} onChange={e => set({ citizenship: e.target.value })} placeholder="Optional" />
          <label className="check"><input type="checkbox" checked={p.needsVisa} onChange={e => set({ needsVisa: e.target.checked })} />I would need visa support</label>
        </div>
        <ListEditor label="Include words" values={p.include} onChange={v => set({ include: v })} maxLength={60} placeholder="e.g. stipend" />
        <ListEditor label="Exclude words" values={p.exclude} onChange={v => set({ exclude: v })} maxLength={60} placeholder="e.g. unpaid" hint="Matching listings are marked excluded." />

        <div className="wide banner info">
          <ShieldAlert size={22} aria-hidden />
          <div className="grow">
            <strong>What leaves your browser</strong>
            <p style={{ margin: '4px 0' }}>Search terms built from your topics, locations, tracks, remote and funding choices, included words and organizations go to <strong>TinyFish</strong> to search and read public pages.
              Bounded public page text then goes to <strong>Groq</strong> to extract facts. Citizenship, visa need and exclusions remain ranking preferences; they are not sent to these providers. Your taste answers are not sent, and no academic or readiness details are needed.</p>
            <label className="check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />I understand and want to search</label>
          </div>
        </div>
        {unavailable && <div className="wide banner err" role="alert"><ShieldAlert size={22} aria-hidden /><div className="grow">
          Live discovery is unavailable: {!configuration.tinyfish && 'TinyFish is not configured. '}{!configuration.groq && 'Groq is not configured.'} No sample results will be shown in its place.</div></div>}
        <div className="wide row between">
          <button type="button" className="btn" onClick={() => update({ screen: 'direction' })}><ArrowLeft size={18} aria-hidden />Direction</button>
          <div className="row">
            {progress.listings.length > 0 && <button type="button" className="btn" onClick={() => update({ screen: 'discovery' })}>Back to results (re-ranked)</button>}
            <button type="submit" className="btn primary" disabled={!ack || busy || !!unavailable}><Search size={18} aria-hidden />{busy ? 'Starting...' : 'Search live sources'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
