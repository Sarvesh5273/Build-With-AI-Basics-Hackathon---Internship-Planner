import { ArrowLeft } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import { deadline, localDay, weekOf } from '../../shared/scheduler';
import { TaskCard } from '../planner-components/TaskCard';
import { GoalSource, fmtDate } from '../planner-components/GoalSource';

export function Timeline({ planner }: { planner: Planner }) {
  const { plan, progress, selectedGoals, update, updatePlanning, now } = planner;
  const a = progress.planning.availability, track = progress.planning.track;
  if (!plan || !a) return <div className="empty"><h3>No roadmap yet</h3><button type="button" className="btn" onClick={() => update({ screen: 'timetable' })}>Open timetable</button></div>;
  const goals = selectedGoals.filter(g => g.listing.track === track), ids = goals.map(g => g.listing.id);
  const inTrack = (gids: string[]) => gids.some(g => ids.includes(g));
  const tasks = plan.tasks.filter(t => inTrack(t.goalIds));
  const wk = (at: number) => weekOf(localDay(at, a.timezone));
  const markers = goals.flatMap(g => { const d = deadline(g, a, now); return [
    ...(d.official !== null ? [{ week: d.dateKey?weekOf(d.dateKey):wk(d.official), label: `${d.closed ? 'Closed' : d.dateOnly?'Published date-only deadline — time unknown':'Official cutoff'}: ${g.listing.title}`, tone: 'bad' }] : []),
    ...(d.personal !== null ? [{ week: wk(d.personal - 1), label: `Personal target: ${g.listing.title}`, tone: 'warn' }] : [])]; });
  const stages = plan.conditionalStages.filter(s => ids.includes(s.goalId));
  const stageWeek = (s: typeof stages[number]) => s.date ? s.date.length===10?weekOf(s.date):wk(Date.parse(s.date)) : null;
  const undated = stages.filter(s => !s.date);
  const unscheduled = tasks.filter(t => !progress.planning.completed[t.id] && !plan.allocations.some(x => x.taskId === t.id));
  const lastUseful = Math.max(0, ...plan.weeks.map((w, i) => (plan.allocations.some(x => x.week === w.week && tasks.some(t => t.id === x.taskId)) || markers.some(m => m.week === w.week) || stages.some(s => stageWeek(s) === w.week) || w.exam) ? i : 0));
  const weeks = plan.weeks.slice(0, Math.max(4, lastUseful + 1));
  const closed = goals.filter(g => plan.goalStates[g.listing.id]?.cycle === 'closed');

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <button type="button" className="btn ghost small" onClick={() => update({ screen: 'overview' })}><ArrowLeft size={18} aria-hidden />Overview</button>
        <p className="mono muted">Step 9 &middot; Timeline</p>
        <h1><span className="hl">{track}</span> week by week</h1>
        <div className="seg" role="group" aria-label="Track">{(['Research', 'Company'] as const).map(t => <button key={t} type="button" aria-pressed={track === t} onClick={() => updatePlanning({ track: t })}>{t}</button>)}</div>
        <p className="hint" style={{ marginTop: 8 }}>Hours are app estimates shared with the other track from one weekly budget. Shared steps appear once with every programme they serve.</p>
      </header>
      {!goals.length && <div className="empty"><p>No {track.toLowerCase()} targets selected.</p></div>}
      {closed.length > 0 && <section className="card" style={{ marginBottom: 18 }}><h2>Closed this cycle</h2>{closed.map(g => <p key={g.listing.id}><strong>{g.listing.title}</strong> &middot; Next call not announced. History and sources kept; only general preparation remains.</p>)}</section>}
      {goals.length > 0 && <ol className="weeks">{weeks.map(w => {
        const allocs = plan.allocations.filter(x => x.week === w.week && tasks.some(t => t.id === x.taskId));
        const ids2 = [...new Set(allocs.map(x => x.taskId))];
        const zeroHour = tasks.filter(t => t.hours === 0 && !progress.planning.completed[t.id] && wk(t.due) === w.week);
        const doneHere = tasks.filter(t => progress.planning.completed[t.id] && wk(Date.parse(progress.planning.completed[t.id].at)) === w.week);
        const ms = markers.filter(m => m.week === w.week), ss = stages.filter(s => stageWeek(s) === w.week);
        return <li key={w.week} className={`week ${w.exam ? 'hatch' : ''} ${w === plan.weeks[0] ? 'now' : ''}`}>
          <div className="week-head"><strong>Week of {fmtDate(w.week)}</strong>
            <span className="mono muted">{w.exam ? 'Exam week · 0h' : `${w.used.toFixed(1)}h of ${w.capacity.toFixed(1)}h planned (all tracks)`}{w.completed ? ` · ${w.completed.toFixed(1)}h done` : ''}</span></div>
          {ms.map((m, i) => <span key={i} className={`sticker ${m.tone}`}>{m.label}</span>)}
          {ss.map((s, i) => <div key={i} className="stage"><span className="tag">Conditional stage, quoted date — only if invited</span> <strong>{s.label}</strong>
            <GoalSource goal={goals.find(g => g.listing.id === s.goalId)} sourceId={s.sourceId} quote={s.quote} summary="Stage source" /></div>)}
          {ids2.map(tid => { const t = tasks.find(x => x.id === tid)!; return <TaskCard key={tid} planner={planner} task={t} highlight={plan.next?.id === tid} weekHours={allocs.filter(x => x.taskId === tid).reduce((n, x) => n + x.hours, 0)} />; })}
          {zeroHour.map(t => <TaskCard key={t.id} planner={planner} task={t} />)}
          {doneHere.filter(t => !ids2.includes(t.id)).map(t => <TaskCard key={t.id} planner={planner} task={t} />)}
          {!ids2.length && !zeroHour.length && !doneHere.length && !ms.length && !ss.length && <p className="hint">{w.exam ? 'Hatched out for exams.' : 'Nothing for this track this week.'}</p>}
        </li>;
      })}</ol>}
      {undated.length > 0 && <section className="card" style={{ marginTop: 18 }}><h2>Conditional stages, date unpublished</h2><p className="hint">Quoted stages without an official date. No date is invented.</p>
        {undated.map((s, i) => <div key={i} className="stage"><strong>{s.label}</strong> &middot; {goals.find(g => g.listing.id === s.goalId)?.listing.title}
          <GoalSource goal={goals.find(g => g.listing.id === s.goalId)} sourceId={s.sourceId} quote={s.quote} summary="Stage source" /></div>)}</section>}
      {unscheduled.length > 0 && <section className="card" style={{ marginTop: 18 }}><h2>Not placed on the timeline</h2><p className="hint">At risk, blocked by a prerequisite, or waiting for confirmation.</p>
        <div className="list">{unscheduled.filter(t => t.hours > 0 || !plan.risk.every(r => r.taskId !== t.id)).map(t => <TaskCard key={t.id} planner={planner} task={t} />)}</div></section>}
    </div>
  );
}
