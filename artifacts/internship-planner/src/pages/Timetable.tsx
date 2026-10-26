import { useId, useMemo, useState } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import type { Planner } from '../lib/usePlanner';
import { AvailabilitySchema, type Availability } from '../../shared/planning';
import { fmtDate } from '../planner-components/GoalSource';

const toMonday = (d: string) => { const t = new Date(d + 'T00:00:00Z'); const n = t.getUTCDay(); t.setUTCDate(t.getUTCDate() - ((n + 6) % 7)); return t.toISOString().slice(0, 10); };

export function Timetable({ planner }: { planner: Planner }) {
  const { progress, selectedGoals, generate } = planner;
  const id = useId();
  const saved = progress.planning.availability;
  const zones = useMemo(() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return []; } }, []);
  const [hours, setHours] = useState(String(saved?.hoursPerWeek ?? 8));
  const [buffer, setBuffer] = useState(String(saved?.bufferDays ?? 3));
  const [tz, setTz] = useState(saved?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Kolkata');
  const [exams, setExams] = useState<string[]>(saved?.examWeeks ?? []);
  const [pick, setPick] = useState('');
  const [targets, setTargets] = useState<Record<string, string>>(saved?.personalTargets ?? {});
  const [errors, setErrors] = useState<string[]>([]);

  const draft: Availability = { hoursPerWeek: hours === '' ? NaN : Number(hours), examWeeks: [...exams].sort(), bufferDays: buffer === '' ? NaN : Number(buffer),
    personalTargets: Object.fromEntries(Object.entries(targets).filter(([k, v]) => v && selectedGoals.some(g => g.listing.id === k))), timezone: tz };
  const submit = () => {
    const r = AvailabilitySchema.safeParse(draft);
    if (!r.success) { setErrors(r.error.issues.map(i => `${i.path.join(' ') || 'Form'}: ${i.message}`)); return; }
    setErrors([]); generate(r.data);
  };
  const undated = (gid: string) => !selectedGoals.find(g => g.listing.id === gid)?.listing.facts.some(f => f.kind === 'deadline' && f.due?.at);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 7 &middot; Timetable</p>
        <h1>Your <span className="hl">one</span> time budget</h1>
        <p style={{ maxWidth: 760 }}>Entered by hand. Both tracks share these hours. Exam weeks get zero preparation time.</p>
      </header>
      <form className="plan-grid" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
        <section className="card tape">
          <div className="prefs">
            <div><label htmlFor={`${id}-h`}>Free hours per week</label><input id={`${id}-h`} type="number" min={0} max={60} step="0.5" value={hours} onChange={e => setHours(e.target.value)} /><p className="hint">0 to 60</p></div>
            <div><label htmlFor={`${id}-b`}>Buffer days before deadlines</label><input id={`${id}-b`} type="number" min={0} max={30} step={1} value={buffer} onChange={e => setBuffer(e.target.value)} /><p className="hint">0 to 30</p></div>
            <div className="wide"><label htmlFor={`${id}-tz`}>Timezone</label>
              {zones.length ? <select id={`${id}-tz`} value={tz} onChange={e => setTz(e.target.value)}>{[...new Set([tz,'UTC',...zones])].map(z => <option key={z}>{z}</option>)}</select>
                : <input id={`${id}-tz`} type="text" value={tz} onChange={e => setTz(e.target.value)} />}</div>
          </div>
          <fieldset style={{ marginTop: 18 }}><legend className="row" style={{ gap: 6 }}><CalendarDays size={18} aria-hidden />Exam weeks</legend>
            <div className="row"><label htmlFor={`${id}-ex`} className="sr-only">Any day in the exam week</label>
              <input id={`${id}-ex`} type="date" value={pick} onChange={e => setPick(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" className="btn small" disabled={!pick} onClick={() => { const m = toMonday(pick); if (!exams.includes(m)) setExams([...exams, m]); setPick(''); }}><Plus size={18} aria-hidden />Add week</button></div>
            <p className="hint">Pick any day; it is stored as that week's Monday.</p>
            <div className="chips">{[...exams].sort().map(w => <span key={w} className="chip hatch"><span>Week of {fmtDate(w)}</span>
              <button type="button" aria-label={`Remove exam week of ${fmtDate(w)}`} onClick={() => setExams(exams.filter(x => x !== w))}><X size={16} /></button></span>)}</div>
          </fieldset>
        </section>
        <section className="card">
          <h2>Personal targets</h2>
          <p className="hint">Your own date, never an official deadline. If left blank for an undated programme, a six-week target is saved when you generate, not moved later each day.</p>
          <ul className="crit">{selectedGoals.map(g => <li key={g.listing.id}>
            <label htmlFor={`${id}-t-${g.listing.id}`}>{g.listing.title}</label>
            <p className="hint">{undated(g.listing.id) ? 'No official date captured.' : 'Official date captured; the earlier of the two is used.'}</p>
            <div className="row"><input id={`${id}-t-${g.listing.id}`} type="date" value={targets[g.listing.id] ?? ''} onChange={e => setTargets({ ...targets, [g.listing.id]: e.target.value })} style={{ maxWidth: 220 }} />
              {targets[g.listing.id] && <button type="button" className="btn small ghost" onClick={() => { const n = { ...targets }; delete n[g.listing.id]; setTargets(n); }}>Clear</button>}</div>
          </li>)}</ul>
          {errors.length > 0 && <div className="banner err" role="alert"><div className="grow"><strong>Fix before generating</strong><ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div></div>}
          <button type="submit" className="btn hot" disabled={!selectedGoals.length}>{progress.planning.generated ? 'Update roadmap' : 'Generate roadmap'}</button>
          {!selectedGoals.length && <p className="hint">Select targets in Discovery first.</p>}
        </section>
      </form>
    </div>
  );
}
