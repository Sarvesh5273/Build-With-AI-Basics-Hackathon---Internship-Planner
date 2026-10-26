import { ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { genreQuestions } from '../../data/genre-questions';
import type { Planner } from '../lib/usePlanner';
import { SourceQuote } from '../planner-components/SourceQuote';

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function DirectionResult({ planner }: { planner: Planner }) {
  const { direction: d, update, progress } = planner;
  const undecided = d.topics.length === 0;
  const interestedQs = genreQuestions.filter(q => progress.reactions[q.id] === 'interested');
  const groupSize = (g: string) => genreQuestions.filter(q => q.genre === g).length;
  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 2 of 4 &middot; Direction</p>
        <h1>{undecided ? <>Still <span className="hl">undecided</span>, and that is fine</> : <>Here is a <span className="hl">direction</span>, not a verdict</>}</h1>
        <p style={{ maxWidth: 720 }}>Each area is scored by the share of its scenarios you liked, so areas with more scenarios do not win by volume.
          This only suggests starting topics you can edit. It does not pick internships and says nothing about your chances.</p>
      </header>
      <div className="dir">
        <section className="card tape" aria-labelledby="areas">
          <h2 id="areas">Areas you leaned toward</h2>
          {undecided ? (
            <div className="empty">
              <Compass size={40} aria-hidden />
              <h3>No area got an interested reaction</h3>
              <p>You can still search broadly. Add topics yourself on the next step, or revise a few scenarios.</p>
            </div>
          ) : d.topics.map(t => (
            <div className="bar-row" key={t.name}>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{t.name}</span>
              <div className="bar" role="img" aria-label={`${t.name}: ${pct(t.interest)} of ${groupSize(t.name)} scenarios liked`}><i style={{ width: pct(t.interest) }} /></div>
              <span className="mono">{pct(t.interest)}</span>
            </div>
          ))}
          <h3 style={{ marginTop: 22 }}>Track lean</h3>
          <p>{d.tracks.length === 0 ? 'Undecided. Both Research and Company will be searched.' : d.tracks.length > 1 ? 'A tie between Research and Company. Both stay on.' : <>Leaning <strong>{d.tracks[0]}</strong>. You can switch both on later.</>}</p>
          {interestedQs.length > 0 && <>
            <h3 style={{ marginTop: 22 }}>Grounded in these sources</h3>
            {interestedQs.map(q => <SourceQuote key={q.id} summary={q.title} quote={q.source.quote} url={q.source.url} title={q.source.title} meta={`Checked ${q.source.checkedAt}`} />)}
          </>}
        </section>
        <aside className="card" aria-labelledby="explore">
          <h2 id="explore">Worth exploring</h2>
          {d.explore.length ? <>
            <p>You marked these as unclear. That means explore, not weak.</p>
            <ul>{d.explore.map(e => <li key={e}>{e}</li>)}</ul>
          </> : <p className="muted">Nothing marked unclear.</p>}
          {d.skills.length > 0 && <>
            <h3>Kinds of work you liked</h3>
            <div className="chips">{d.skills.map(s => <span key={s} className="tag ok">{s}</span>)}</div>
          </>}
          <div className="row" style={{ marginTop: 20 }}>
            <button type="button" className="btn" onClick={() => update({ screen: 'taste' })}><ArrowLeft size={18} aria-hidden />Revise answers</button>
            <button type="button" className="btn primary" onClick={() => update({ screen: 'preferences' })}>Set preferences<ArrowRight size={18} aria-hidden /></button>
          </div>
        </aside>
      </div>
    </div>
  );
}
