import { useId, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, FileSearch, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import type { Profile } from '../../shared/planning';
import { eligibility } from '../../shared/eligibility';
import { GoalSource, fmtDate } from '../planner-components/GoalSource';

const statusLabel = { meetsExtractedCriteria: ['Meets extracted criteria based on your details', 'ok'], failsCriteria: ['Not eligible', 'bad'], needsConfirmation: ['Needs confirmation', 'warn'] } as const;
const critTag = { met: ['Met', 'ok'], failed: ['Failed', 'bad'], unknown: ['Unconfirmed', 'unk'] } as const;

export function Eligibility({ planner }: { planner: Planner }) {
  const { progress, selectedGoals, updateProfile, prepare, preparation, preparing, configuration, update } = planner;
  const profile = progress.planning.profile;
  const id = useId();
  const [showAll, setShowAll] = useState(false);
  const needed = useMemo(() => new Set(selectedGoals.flatMap(g => g.listing.facts.filter(f => f.kind === 'eligibility' && f.rule).map(f => f.rule!.field))), [selectedGoals]);
  const show = (f: string) => showAll || needed.has(f as never);
  const set = (change: Partial<Profile>) => updateProfile({ ...profile, ...change });
  const num = (v: string, int = true) => v === '' ? null : int ? Math.trunc(Number(v)) : Number(v);
  const results = selectedGoals.map(g => ({ g, r: eligibility(g, profile) }));
  const confirm = (key: string, v: boolean | null) => updateProfile({ ...profile, confirmations: { ...profile.confirmations, [key]: v } });

  if (!selectedGoals.length) return <div className="empty"><FileSearch size={40} aria-hidden /><h3>No targets selected</h3>
    <p>Pick targets in Discovery first. Saving a listing does not select it.</p>
    <button type="button" className="btn" onClick={() => update({ screen: 'discovery' })}>Back to Discovery</button></div>;

  const field = (key: keyof Profile, label: string, input: ReactNode, hint?: string) => (
    <div><label htmlFor={`${id}-${key}`}>{label}{needed.has(key as never) && <span className="inferred">source asks</span>}</label>{input}{hint && <p className="hint">{hint}</p>}</div>);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 5 &middot; Eligibility</p>
        <h1>Can you <span className="hl">apply</span>?</h1>
        <p style={{ maxWidth: 760 }}>A preliminary check of your details against criteria quoted from each target's sources (third-party quotes are labelled unverified). It is not certification. Your academic profile stays in this browser.</p>
      </header>
      <div className="plan-grid">
        <section className="card tape" aria-labelledby="prof-h">
          <h2 id="prof-h">Academic profile</h2>
          <div className="prefs">
            {field('nationality', 'Nationality', <input id={`${id}-nationality`} type="text" value={profile.nationality} maxLength={60} onChange={e => set({ nationality: e.target.value })} />)}
            {field('studyYear', 'Year of study', <input id={`${id}-studyYear`} type="number" min={1} max={12} value={profile.studyYear ?? ''} onChange={e => set({ studyYear: num(e.target.value) })} />)}
            {field('gradeValue', 'Grade value', <input id={`${id}-gradeValue`} type="number" min={0} max={1000} step="0.01" value={profile.gradeValue ?? ''} onChange={e => set({ gradeValue: num(e.target.value, false) })} />)}
            {field('gradeScale', 'Grade scale', <input id={`${id}-gradeScale`} type="text" value={profile.gradeScale} maxLength={40} placeholder="10, 4, or %" onChange={e => set({ gradeScale: e.target.value })} />, 'No CGPA-to-percentage conversion is made.')}
            <div className="wide">{field('branch', 'Branch / major', <input id={`${id}-branch`} type="text" value={profile.branch} maxLength={160} onChange={e => set({ branch: e.target.value })} />)}</div>
            {show('institute') && field('institute', 'Institute', <input id={`${id}-institute`} type="text" value={profile.institute} maxLength={160} onChange={e => set({ institute: e.target.value })} />)}
            {show('degree') && field('degree', 'Degree', <input id={`${id}-degree`} type="text" value={profile.degree} maxLength={80} onChange={e => set({ degree: e.target.value })} />)}
            {show('degreeDate') && field('degreeDate', 'Expected degree date', <input id={`${id}-degreeDate`} type="date" value={profile.degreeDate ?? ''} onChange={e => set({ degreeDate: e.target.value || null })} />)}
            {show('remainingSemesters') && field('remainingSemesters', 'Remaining semesters', <input id={`${id}-remainingSemesters`} type="number" min={0} max={30} value={profile.remainingSemesters ?? ''} onChange={e => set({ remainingSemesters: num(e.target.value) })} />)}
            {show('english') && <fieldset className="wide"><legend>Are you comfortable working in English?{needed.has('english') && <span className="inferred">source asks</span>}</legend>
              <div className="seg">{([[true, 'Yes'], [false, 'No'], [null, 'Not stated']] as const).map(([v, l]) => <button key={l} type="button" aria-pressed={profile.english === v} onClick={() => set({ english: v })}>{l}</button>)}</div></fieldset>}
          </div>
          <label className="check"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />Show every profile field, including ones no source asks for</label>
          <p className="hint">Changing details clears earlier source-specific confirmations so they are re-checked.</p>
        </section>

        <section className="card" aria-labelledby="prep-h">
          <h2 id="prep-h" className="row" style={{ gap: 8 }}><FileSearch aria-hidden />Source preparation</h2>
          <p>Reads your selected targets' official pages more fully and builds the readiness question pack. Public page text is interpreted by <strong>your own Groq</strong> configuration. Nothing from your profile is sent.</p>
          {configuration && !configuration.groq && <p className="banner err" style={{ display: 'block' }}>Groq is not configured, so preparation is unavailable. Eligibility below still uses the saved discovery snapshot.</p>}
          {preparation && <div className="status-strip" role="status" style={{ marginBottom: 10 }}>
            {preparing && <span className="pulse" aria-hidden />}<span className="tag">{preparation.status}</span><span>{preparation.stage}</span></div>}
          {preparation?.errors.map((e, i) => <p key={i} className="hint">Gap: {e}</p>)}
          {!preparation && preparing && <div className="skel" style={{ height: 60 }} aria-hidden />}
          <div className="row">
            <button type="button" className="btn primary" disabled={preparing || configuration?.groq === false} onClick={() => prepare()}>
              <RefreshCw size={18} aria-hidden />{progress.planning.pack ? 'Prepare again' : 'Prepare sources'}</button>
            {preparing&&progress.planning.preparationId&&<button type="button" className="btn" onClick={()=>planner.cancelPreparation()}>Cancel preparation</button>}
            {preparation && preparation.pending.length > 0 && !preparing && <button type="button" className="btn" onClick={() => prepare(preparation.id)}>Continue {preparation.pending.length} pending</button>}
          </div>
          <p className="hint">Preparation stops after at most 180 seconds. Cancellation preserves accepted evidence; remaining targets need an explicit continuation. Source/model limits can stop it earlier.</p>
          <p className="hint">{progress.planning.pack ? `Question pack ready: ${progress.planning.pack.questions.length} questions.` : 'No question pack yet. Readiness needs one.'}</p>
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn lime" disabled={!progress.planning.pack} onClick={() => update({ screen: 'readiness' })}>Readiness interview<ArrowRight size={18} aria-hidden /></button>
            <button type="button" className="btn ghost" onClick={() => update({ screen: 'timetable' })}>Skip to timetable</button>
          </div>
        </section>
      </div>

      <h2 style={{ marginTop: 30 }} className="row"><ShieldCheck aria-hidden />Your {results.length} target{results.length === 1 ? '' : 's'}</h2>
      <div className="list">
        {results.map(({ g, r }) => {
          const [label, tone] = statusLabel[r.status];
          return <article key={g.listing.id} className={`card elig ${tone}`}>
            <div className="listing-head"><div><p className="mono muted">{g.listing.track} &middot; {g.listing.organization}</p><h3>{g.listing.title}</h3></div>
              <span className={`sticker ${tone}`}>{label}</span></div>
            <p className="mono muted">Prepared {fmtDate(g.preparedAt)} &middot; {g.sourceStatus.join(' ')}</p>
            {r.criteria.length > 0 && <ul className="crit">{r.criteria.map(c => {
              const f = g.listing.facts[c.factIndex]; const [cl, ct] = critTag[c.status];
              const canConfirm = c.needsFollowup && f.rule && f.rule.field !== 'other';
              return <li key={c.key}>
                <div className="row between"><strong style={{ overflowWrap: 'anywhere' }}>{f.value}</strong><span className={`tag ${ct}`}>{cl}</span></div>
                <p className="hint">{c.reason}</p>
                {canConfirm && <fieldset><legend className="hint">Does this apply to you for the stated period?</legend><div className="seg">
                  {([[true, 'Yes, I meet it'], [false, 'No'], [null, 'Unsure']] as const).map(([v, l]) =>
                    <button key={l} type="button" aria-pressed={(profile.confirmations[c.key] ?? null) === v} onClick={() => confirm(c.key, v)}>{l}</button>)}</div></fieldset>}
                <GoalSource goal={g} sourceId={f.sourceId} quote={f.quote} />
              </li>;
            })}</ul>}
            {r.gaps.length > 0 && <div className="gaps"><strong>Honest gaps</strong><ul>{r.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </article>;
        })}
      </div>
    </div>
  );
}
