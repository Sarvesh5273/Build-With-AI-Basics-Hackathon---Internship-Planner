import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { genreQuestions } from '../data/genre-questions';
import { usePlanner, type Progress } from './lib/usePlanner';
import { ConfirmDialog } from './planner-components/ConfirmDialog';
import { TasteTest } from './pages/TasteTest';
import { DirectionResult } from './pages/DirectionResult';
import { SearchPreferences } from './pages/SearchPreferences';
import { DiscoveryResults } from './pages/DiscoveryResults';
import { Eligibility } from './pages/Eligibility';
import { Readiness } from './pages/Readiness';
import { Timetable } from './pages/Timetable';
import { Overview } from './pages/Overview';
import { Timeline } from './pages/Timeline';

const steps: { screen: Progress['screen']; label: string }[] = [
  { screen: 'taste', label: 'Taste' }, { screen: 'direction', label: 'Direction' },
  { screen: 'preferences', label: 'Preferences' }, { screen: 'discovery', label: 'Discovery' },
  { screen: 'eligibility', label: 'Eligibility' }, { screen: 'readiness', label: 'Readiness' },
  { screen: 'timetable', label: 'Timetable' }, { screen: 'overview', label: 'Roadmap' }, { screen: 'timeline', label: 'Timeline' },
];

function App() {
  const planner = usePlanner();
  const { progress, update, storageWarning, reset } = planner;
  const [confirmReset, setConfirmReset] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const allAnswered = genreQuestions.every(q => progress.reactions[q.id]);
  const hasTargets = progress.selected.length > 0;
  const reachable = (s: Progress['screen']) => {
    if (s === 'taste') return true;
    if (!allAnswered) return false;
    if (s === 'discovery') return !!progress.runId || progress.listings.length > 0;
    if (s === 'eligibility' || s === 'timetable') return hasTargets;
    if (s === 'readiness') return hasTargets && !!progress.planning.pack;
    if (s === 'overview' || s === 'timeline') return !!planner.plan;
    return true;
  };
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus();
  }, [progress.screen]);

  return (
    <div className="shell">
      <a href="#main" className="btn skip">Skip to content</a>
      <header className="top">
        <div className="brand"><span className="brand-mark" aria-hidden>IP</span>Internship Planner</div>
        <button type="button" className="btn small" onClick={() => setConfirmReset(true)}><RotateCcw size={18} aria-hidden />Start over</button>
      </header>
      <nav aria-label="Progress">
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.screen}><button type="button" className="step" aria-current={progress.screen === s.screen ? 'step' : undefined}
              disabled={!reachable(s.screen)} onClick={() => update({ screen: s.screen })}><span className="n">{i + 1}</span>{s.label}</button></li>
          ))}
        </ol>
      </nav>
      {storageWarning && <div className="banner" role="alert"><AlertTriangle size={20} aria-hidden /><div className="grow">{storageWarning}
        {storageWarning.startsWith('Browser storage') && <p style={{margin:'10px 0 0'}}><a className="btn small" href="/" target="_blank" rel="noopener noreferrer">Open app in a new tab</a></p>}
      </div></div>}
      {planner.error && <div className="banner err" role="alert"><AlertTriangle size={20} aria-hidden /><div className="grow">{planner.error}</div></div>}
      <main id="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        {progress.screen === 'taste' && <TasteTest planner={planner} />}
        {progress.screen === 'direction' && <DirectionResult planner={planner} />}
        {progress.screen === 'preferences' && <SearchPreferences planner={planner} />}
        {progress.screen === 'discovery' && <DiscoveryResults planner={planner} />}
        {progress.screen === 'eligibility' && <Eligibility planner={planner} />}
        {progress.screen === 'readiness' && <Readiness planner={planner} />}
        {progress.screen === 'timetable' && <Timetable planner={planner} />}
        {progress.screen === 'overview' && <Overview planner={planner} />}
        {progress.screen === 'timeline' && <Timeline planner={planner} />}
      </main>
      <ConfirmDialog open={confirmReset} title="Start over?" confirmLabel="Erase and restart" danger
        onCancel={() => setConfirmReset(false)} onConfirm={() => { reset(); setConfirmReset(false); }}>
        <p>This erases your taste answers, preferences, stored results, saved, hidden and selected listings, academic profile, readiness answers, timetable and roadmap progress from this browser. It cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

export default App;
