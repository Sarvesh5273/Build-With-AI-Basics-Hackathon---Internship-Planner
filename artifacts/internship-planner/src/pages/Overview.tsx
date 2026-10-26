import { ArrowRight, CalendarX, Highlighter } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import { deadline } from '../../shared/scheduler';
import { readiness } from '../../shared/question-bank';
import { TaskCard } from '../planner-components/TaskCard';
import { fmtDate } from '../planner-components/GoalSource';

const elig = { meetsExtractedCriteria: ['Meets extracted criteria', 'ok'], failsCriteria: ['Not eligible', 'bad'], needsConfirmation: ['Needs confirmation', 'warn'] } as const;

export function Overview({ planner }: { planner: Planner }) {
  const { plan, progress, selectedGoals, update, updatePlanning, now } = planner;
  const a = progress.planning.availability;
  if (!plan || !a) return <div className="empty"><CalendarX size={40} aria-hidden /><h3>No roadmap yet</h3><p>Enter your timetable to generate one.</p>
    <button type="button" className="btn" onClick={() => update({ screen: 'timetable' })}>Open timetable</button></div>;
  const week = plan.weeks[0];
  const levels = progress.planning.pack ? readiness(progress.planning.pack, progress.planning.assessment) : [];
  const open = (track: 'Research' | 'Company') => { updatePlanning({ track }); update({ screen: 'timeline' }); };
  const pendingIn = (ids: string[]) => plan.tasks.filter(t => !progress.planning.completed[t.id] && t.goalIds.some(g => ids.includes(g)));
  const why = week.exam ? 'This is an exam week, so nothing is scheduled.' : week.capacity <= 0 ? 'No free hours remain this week.' :
    plan.tasks.every(t => progress.planning.completed[t.id]) ? 'Everything planned is marked done.' : 'Remaining steps are waiting on dependencies, confirmations or later weeks.';

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 8 &middot; Roadmap</p>
        <h1>This week, <span className="hl">one thing</span></h1>
        <p className="mono muted">{week.used.toFixed(1)}h planned of {week.capacity.toFixed(1)}h left this week &middot; {week.completed.toFixed(1)}h marked done &middot; checked {fmtDate(now, a.timezone)}</p>
      </header>
      <section aria-labelledby="next-h" style={{ marginBottom: 28 }}>
        <h2 id="next-h" className="row" style={{ gap: 8 }}><Highlighter aria-hidden />This week's step</h2>
        {plan.next ? <TaskCard planner={planner} task={plan.next} highlight weekHours={plan.allocations.filter(x => x.taskId === plan.next!.id && x.week === week.week).reduce((n, x) => n + x.hours, 0)} />
          : <div className={`empty ${week.exam ? 'hatch' : ''}`}><p style={{ margin: 0 }}><strong>No step this week.</strong> {why}</p></div>}
      </section>
      <div className="tracks">
        {(['Research', 'Company'] as const).map(track => {
          const goals = selectedGoals.filter(g => g.listing.track === track), ids = goals.map(g => g.listing.id);
          const risks = plan.risk.filter(r => r.goalIds.some(g => ids.includes(g)));
          return <article key={track} className={`card track ${track.toLowerCase()}`}>
            <div className="row between"><h2>{track}</h2><span className="tag">{goals.length} programme{goals.length === 1 ? '' : 's'}</span></div>
            {!goals.length ? <p className="muted">No {track.toLowerCase()} targets selected.</p> : <ul className="crit">{goals.map(g => {
              const s = plan.goalStates[g.listing.id], d = deadline(g, a, now), [el, et] = elig[s?.eligibility ?? 'needsConfirmation'];
              return <li key={g.listing.id}><strong>{g.listing.title}</strong>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <span className={`tag ${et}`}>{el}</span>
                  {s?.cycle === 'closed' && <span className="sticker bad">Closed this cycle</span>}
                  {s?.overdue && <span className="sticker warn">Personal target overdue</span>}
                  {risks.some(r => r.goalIds.includes(g.listing.id)) && <span className="tag bad">At risk</span>}
                </div>
                <p className="hint">{d.closed ? 'Check saved future-call evidence; no next opening date is inferred.' : d.official !== null ? d.dateOnly?<>Published deadline date {d.dateKey}, time/timezone unknown. Planning uses an earlier conservative cutoff.</>:<>Official cutoff {fmtDate(d.official, a.timezone)} (quoted)</> :
                  d.personal !== null ? <>Personal target {fmtDate(a.personalTargets[g.listing.id])}, not official</> : 'Official date unknown; default six-week personal target.'}</p></li>;
            })}</ul>}
            {levels.length > 0 && <p className="hint">Linked foundation readiness: {levels.filter(l=>progress.planning.pack?.questions.some(q=>q.area===l.area&&q.goalIds.some(g=>ids.includes(g)))).map(l => `${l.area} ${l.status}`).join(' · ')||'Not assessed against this track’s published requirements.'}</p>}
            <p className="mono muted">{pendingIn(ids).length} open steps &middot; {risks.length} at risk</p>
            <button type="button" className="btn lime" disabled={!goals.length} onClick={() => open(track)}>Open {track} timeline<ArrowRight size={18} aria-hidden /></button>
          </article>;
        })}
      </div>
      {Object.keys(progress.planning.completed).length>0&&<details className="card" style={{marginTop:18}}>
        <summary>Completed history — retained across closed or deselected targets</summary>
        <ul className="crit">{Object.entries(progress.planning.completed).map(([id,c])=><li key={id}>
          <strong>{c.label??id}</strong><p className="hint">{fmtDate(c.at,a.timezone)} · {c.hours.toFixed(1)}h estimated, not clocked.
          {c.goalIds?.map(g=>progress.listings.find(l=>l.id===g)?.title??'Previously selected target').join(' · ')}</p>
          {plan.tasks.some(t=>t.id===id)&&<button type="button" className="btn small" onClick={()=>planner.reopen(id)}>Reopen work</button>}
        </li>)}</ul>
      </details>}
      <div className="row" style={{ marginTop: 22 }}>
        <button type="button" className="btn" onClick={() => update({ screen: 'timetable' })}>Edit timetable</button>
        <button type="button" className="btn ghost" onClick={() => update({ screen: 'eligibility' })}>Edit profile</button>
      </div>
    </div>
  );
}
