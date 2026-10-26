import { Check, Clock, Undo2 } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import type { PlannedTask } from '../../shared/planning';
import { GoalSource, fmtDate } from './GoalSource';

export function TaskCard({ planner, task, weekHours, highlight }: { planner: Planner; task: PlannedTask; weekHours?: number; highlight?: boolean }) {
  const { progress, selectedGoals, complete, reopen, plan } = planner;
  const done = progress.planning.completed[task.id];
  const tz = progress.planning.availability?.timezone;
  const risk = plan?.risk.find(r => r.taskId === task.id);
  const name = (gid: string) => selectedGoals.find(g => g.listing.id === gid)?.listing.title ?? 'Removed target';
  return (
    <article className={`task ${highlight ? 'marker' : ''} ${done ? 'done' : ''}`}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 6, marginBottom: 4 }}>
            <span className={`tag ${task.kind === 'external' ? 'warn' : task.kind === 'review' ? 'unk' : ''}`}>{task.kind === 'external' ? 'External / confirmation' : task.kind === 'review' ? 'Review' : 'Preparation'}</span>
            {task.officialConstraint ? <span className="tag">Official requirement</span> : <span className="tag unk">App guidance</span>}
            {risk && <span className="tag bad">At risk</span>}
          </div>
          <h4>{task.label}</h4>
          <div className="chips">{task.goalIds.map(g => <span key={g} className="tag prog">{name(g)}</span>)}</div>
        </div>
        <div className="hrs"><Clock size={14} aria-hidden /> {weekHours != null ? `${weekHours.toFixed(1)} of ` : ''}{task.hours.toFixed(1)}h est.</div>
      </div>
      <p className="hint">Due {fmtDate(task.due, tz)} &middot; {task.dueLabel}{task.waitDays ? ` · includes ~${task.waitDays} days waiting on someone else` : ''}</p>
      <p className="hint">{task.guidance}</p>
      {risk && <p className="hint"><strong>Why at risk:</strong> {risk.reason}</p>}
      {task.sourceRefs.slice(0, 3).map((r, i) => <GoalSource key={i} goal={selectedGoals.find(g => g.listing.id === r.goalId)} sourceId={r.sourceId} quote={r.quote} summary={<>Why: quoted requirement &middot; {name(r.goalId)}</>} />)}
      <div className="row" style={{ marginTop: 10 }}>
        {done ? <><span className="mono muted">Marked done {fmtDate(done.at, tz)}</span><button type="button" className="btn small" onClick={() => reopen(task.id)}><Undo2 size={16} aria-hidden />Not done</button></>
          : <button type="button" className={`btn small ${highlight ? 'primary' : ''}`} onClick={() => complete(task.id, task.hours)}><Check size={16} aria-hidden />{task.kind === 'external' ? 'Confirmed' : 'Mark done'}</button>}
      </div>
    </article>
  );
}
