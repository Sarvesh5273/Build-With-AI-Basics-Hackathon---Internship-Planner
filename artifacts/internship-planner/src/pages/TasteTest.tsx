import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HelpCircle, X } from 'lucide-react';
import { genreQuestions } from '../../data/genre-questions';
import type { Reaction } from '../../shared/direction';
import type { Planner } from '../lib/usePlanner';
import { SourceQuote } from '../planner-components/SourceQuote';

const options: { value: Reaction; label: string; Icon: typeof Check }[] = [
  { value: 'interested', label: 'I would like this', Icon: Check },
  { value: 'unclear', label: 'Not sure yet', Icon: HelpCircle },
  { value: 'notForMe', label: 'Not for me', Icon: X },
];
const labelOf = (r?: Reaction) => options.find(o => o.value === r)?.label ?? 'Unanswered';

export function TasteTest({ planner }: { planner: Planner }) {
  const { progress, react, finishTaste } = planner;
  const firstOpen = genreQuestions.findIndex(q => !progress.reactions[q.id]);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const q = genreQuestions[index];
  const answered = genreQuestions.filter(x => progress.reactions[x.id]).length;
  const total = genreQuestions.length;
  const go = (i: number) => { setIndex(i); requestAnimationFrame(() => headingRef.current?.focus()); };
  const choose = (r: Reaction) => {
    react(q.id, r);
    if (index < total - 1) setTimeout(() => go(index + 1), 220);
  };

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <p className="mono muted">Step 1 of 4 &middot; Taste</p>
        <h1>What kind of work <span className="hl">pulls you in</span>?</h1>
        <p style={{ maxWidth: 720 }}>Twelve short work scenarios. React honestly; there are no right answers and nothing here measures ability.
          These scenarios are <strong>written by this app</strong> from real official program descriptions. They are not interview questions from any employer or lab.</p>
      </header>
      <div className="taste">
        <section className="card tape scenario" key={q.id} aria-labelledby="scn-title">
          <div className="kicker">
            <span className="tag">{index + 1} / {total}</span>
            <span className="tag">{q.track}</span>
            <span className="tag">{q.genre}</span>
          </div>
          <h2 id="scn-title" ref={headingRef} tabIndex={-1}>{q.title}</h2>
          <p className="big">{q.scenario}</p>
          <div className="reacts" role="group" aria-label="Your reaction">
            {options.map(({ value, label, Icon }) => (
              <button key={value} type="button" className={`react ${value}`} aria-pressed={progress.reactions[q.id] === value} onClick={() => choose(value)}>
                <Icon size={20} aria-hidden />{label}
              </button>
            ))}
          </div>
          <SourceQuote summary="Where this scenario comes from" quote={q.source.quote} url={q.source.url} title={q.source.title}
            meta={`Source checked ${q.source.checkedAt}. The quote grounds the scenario; the wording above is the app's.`} />
          <div className="row between" style={{ marginTop: 18 }}>
            <button type="button" className="btn" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={18} aria-hidden />Previous</button>
            <button type="button" className="btn" onClick={() => go(index + 1)} disabled={index === total - 1}>Next<ArrowRight size={18} aria-hidden /></button>
          </div>
        </section>

        <aside className="card" aria-labelledby="prog-title">
          <h3 id="prog-title">Your answers</h3>
          <p aria-live="polite" className="mono">{answered} of {total} answered</p>
          <div className="meter" aria-hidden><i style={{ transform: `scaleX(${answered / total})` }} /></div>
          <p className="hint" style={{ margin: '12px 0' }}>Jump to any scenario to revise it.</p>
          <div className="dots">
            {genreQuestions.map((x, i) => (
              <button key={x.id} type="button" className={`dot ${progress.reactions[x.id] ?? ''}`} aria-current={i === index}
                aria-label={`Scenario ${i + 1}: ${x.title}. ${labelOf(progress.reactions[x.id])}`} onClick={() => go(i)}>{i + 1}</button>
            ))}
          </div>
          <button type="button" className="btn primary" style={{ width: '100%', marginTop: 18 }} disabled={answered < total} onClick={finishTaste} aria-describedby="finish-hint">
            See my direction<ArrowRight size={18} aria-hidden />
          </button>
          <p id="finish-hint" className="hint">{answered < total ? `Answer all ${total} to continue (${total - answered} left).` : 'All answered. You can still revise any scenario.'}</p>
        </aside>
      </div>
    </div>
  );
}
