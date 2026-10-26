import { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardCheck, Send } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import { readiness } from '../../shared/question-bank';
import { GoalSource } from '../planner-components/GoalSource';

const tone: Record<string, string> = { Ready: 'ok', Partly: 'warn', 'Not yet': 'bad', 'Not assessed': 'unk' };
const itemLabel = { met: 'Met', partial: 'Partly', missing: 'Missing', notAssessed: 'Not assessed' } as const;

export function Readiness({ planner }: { planner: Planner }) {
  const { progress, updatePlanning, update, assess, assessing, selectedGoals, configuration } = planner;
  const { pack, answers, assessment } = progress.planning;
  const id = useId();
  const [consent, setConsent] = useState(false);
  if (!pack) return <div className="empty"><ClipboardCheck size={40} aria-hidden /><h3>No question pack yet</h3>
    <p>Prepare sources on the Eligibility step to build questions from your targets' quoted skills.</p>
    <div className="row" style={{ justifyContent: 'center' }}><button type="button" className="btn" onClick={() => update({ screen: 'eligibility' })}>Go to Eligibility</button>
      <button type="button" className="btn ghost" onClick={() => update({ screen: 'timetable' })}>Continue without assessment</button></div></div>;

  const qs = pack.questions, idx = Math.min(progress.planning.questionIndex, qs.length), q = qs[idx];
  const go = (n: number) => updatePlanning({ questionIndex: Math.max(0, Math.min(qs.length, n)) });
  const goalName = (gid: string) => selectedGoals.find(g => g.listing.id === gid)?.listing.title ?? progress.listings.find(l => l.id === gid)?.title ?? 'Target no longer stored';
  const fresh = assessment && assessment.packId === pack.id && assessment.packVersion === pack.version ? assessment : null;
  const answered = qs.filter(x => (answers[x.id] ?? '').trim()).length;

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 6 &middot; Readiness</p>
        <h1>A short <span className="hl">level check</span></h1>
        <p style={{ maxWidth: 760 }}>{qs.length} reviewed or clearly labelled app-generated foundation questions. A source topic is not proof of a mandatory skill. Not an employer interview, mastery test or admission chance.</p>
      </header>
      <div className="dots" style={{ gridTemplateColumns: `repeat(${qs.length + 1}, minmax(0,1fr))`, marginBottom: 18 }}>
        {qs.map((x, i) => <button key={x.id} type="button" className={`dot ${(answers[x.id] ?? '').trim() ? 'interested' : ''}`} aria-current={i === idx} aria-label={`Question ${i + 1}${(answers[x.id] ?? '').trim() ? ', answered' : ''}`} onClick={() => go(i)}>{i + 1}</button>)}
        <button type="button" className="dot" aria-current={idx === qs.length} onClick={() => go(qs.length)}>Sum</button>
      </div>

      {q ? <section className="card scenario tape" key={q.id} aria-labelledby={`${id}-q`}>
        <div className="kicker"><span className="tag">{q.area}</span><span className="tag unk">{q.origin === 'reviewed' ? 'Reviewed app question' : 'Generated app question'}</span><span className="mono muted">Question {idx + 1} of {qs.length}</span></div>
        <h2 id={`${id}-q`} style={{ fontSize: '1.4rem' }}>{q.prompt}</h2>
        <p className="hint">Scope: {q.scope}</p>
        <label htmlFor={`${id}-a`} style={{ marginTop: 14 }}>Your answer</label>
        <textarea id={`${id}-a`} rows={7} maxLength={1500} value={answers[q.id] ?? ''} onChange={e => updatePlanning({ answers: { ...answers, [q.id]: e.target.value } })}
          placeholder="Write in your own words. Do not include personal or private information." />
        <p className="hint">{(answers[q.id] ?? '').length}/1500 &middot; Leave blank to skip; skipped questions show Not assessed.</p>
        <details className="src"><summary>Fixed rubric ({q.rubrics.length})</summary><ul>{q.rubrics.map(r => <li key={r.id}>{r.criterion}</li>)}</ul></details>
        {q.sourceRefs.length > 0 ? q.sourceRefs.slice(0, 4).map((r, i) => <GoalSource key={i} goal={selectedGoals.find(g => g.listing.id === r.goalId)} sourceId={r.sourceId} quote={r.quote} summary={<>Quoted skill/topic &middot; {goalName(r.goalId)}</>} />)
          : <p className="hint">General foundation; no published requirement is linked.</p>}
        <div className="row between" style={{ marginTop: 18 }}>
          <button type="button" className="btn" disabled={idx === 0} onClick={() => go(idx - 1)}><ArrowLeft size={18} aria-hidden />Back</button>
          <button type="button" className="btn primary" onClick={() => go(idx + 1)}>{idx + 1 === qs.length ? 'Review' : 'Next'}<ArrowRight size={18} aria-hidden /></button>
        </div>
      </section> : (
        <div className="plan-grid">
          <section className="card" aria-labelledby={`${id}-sub`}>
            <h2 id={`${id}-sub`}>Send for assessment</h2>
            <p>{answered} of {qs.length} answered. Answers stay saved here whatever happens.</p>
            <p className="hint">One bounded assessment, at most 90 seconds. Coverage remains partial when you skip questions. A failure never retries paid work automatically.</p>
            <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              I understand my answer text goes to my own Groq configuration for rubric scoring, and I have not included private information.</label>
            {configuration && !configuration.groq && <p className="hint">Groq is not configured; assessment is unavailable.</p>}
            <div className="row" style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" disabled={!consent || assessing || !answered || configuration?.groq === false} onClick={() => assess()}>
                <Send size={18} aria-hidden />{assessing ? 'Assessing' : fresh ? 'Re-assess' : 'Assess answers'}</button>
              <button type="button" className="btn" onClick={() => update({ screen: 'timetable' })}>{fresh ? 'Continue to timetable' : 'Continue without assessment'}<ArrowRight size={18} aria-hidden /></button>
            </div>
            {assessing && <div className="skel" style={{ height: 70, marginTop: 12 }} aria-hidden />}
          </section>
          <section className="card" aria-labelledby={`${id}-cov`}>
            <h2 id={`${id}-cov`}>Coverage per target</h2>
            <ul className="crit">{pack.targets.map(t => {
              const n = qs.filter(x => x.goalIds.includes(t.id)).length, un = pack.uncovered[t.id] ?? [];
              return <li key={t.id}><strong>{goalName(t.id)}</strong><p className="hint">{n} question{n === 1 ? '' : 's'} linked to its quoted skills.</p>
                {un.length > 0 && <ul>{un.map((u, i) => <li key={i}><span className="tag unk">Not assessed</span> {u}</li>)}</ul>}</li>;
            })}</ul>
          </section>
        </div>)}

      <section style={{ marginTop: 26 }} aria-labelledby={`${id}-res`}>
        <h2 id={`${id}-res`}>Per-skill status</h2>
        <div className="facts">{readiness(pack, fresh).map(r => <div key={r.area} className="fact"><div className="row between"><strong>{r.area}</strong><span className={`tag ${tone[r.status]}`}>{r.status}</span></div>
          <p className="hint">{r.covered} of {r.total} rubric points assessed. {r.scope}</p></div>)}</div>
        {fresh && <div className="list">{qs.map(x => <details key={x.id} className="src"><summary>{x.area}: {x.prompt.slice(0, 80)}{x.prompt.length > 80 ? '...' : ''}</summary>
          <ul className="crit">{x.rubrics.map(r => { const it = fresh.items.find(i => i.questionId === x.id && i.rubricId === r.id);
            return <li key={r.id}><div className="row between"><span>{r.criterion}</span><span className={`tag ${it ? { met: 'ok', partial: 'warn', missing: 'bad', notAssessed: 'unk' }[it.status] : 'unk'}`}>{it ? itemLabel[it.status] : 'Not assessed'}</span></div>
              {it?.reason && <p className="hint">{it.reason}</p>}{it?.excerpt && <blockquote className="quote">&ldquo;{it.excerpt}&rdquo;</blockquote>}</li>; })}</ul></details>)}</div>}
      </section>
    </div>
  );
}
