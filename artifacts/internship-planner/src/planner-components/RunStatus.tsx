import { AlertTriangle, CircleStop, RefreshCw, Plus } from 'lucide-react';
import { DISCOVERY_RUN_MS, DISCOVERY_WIND_DOWN_MS } from '../../shared/limits';
import { useEffect, useState } from 'react';
import type { Planner } from '../lib/usePlanner';

const labels: Record<string, string> = {
  queued: 'Queued', searching: 'Searching the web', reading: 'Reading official pages', interpreting: 'Extracting evidence',
  complete: 'Search complete', partial: 'Finished with some gaps', failed: 'Search failed', cancelled: 'Search cancelled',
};

export function RunStatus({ planner }: { planner: Planner }) {
  const { run, busy, cancel, search, error, progress, searchUnavailable } = planner;
  const live = busy || !!run && ['queued', 'searching', 'reading', 'interpreting'].includes(run.status);
  const finished = run && !live;
  const [clock,setClock]=useState(()=>Date.now());
  useEffect(()=>{
    if(!live)return;
    setClock(Date.now());
    const timer=window.setInterval(()=>setClock(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[live,run?.startedAt]);
  const remaining=run?Math.max(0,Math.ceil((Date.parse(run.startedAt)+DISCOVERY_RUN_MS-clock)/1000)):DISCOVERY_RUN_MS/1000;
  const wrap=Math.max(0,remaining-(DISCOVERY_RUN_MS-DISCOVERY_WIND_DOWN_MS)/1000);
  return (
    <section className="card" aria-labelledby="run-h">
      <div className="status-strip">
        {live && <span className="pulse" aria-hidden />}
        <h2 id="run-h" style={{ margin: 0, fontSize: '1.3rem' }}>
          <span aria-live="polite">{run ? labels[run.status] : busy ? 'Connecting to search' : searchUnavailable ? 'Previous search unavailable' : progress.runId ? 'Search status unavailable' : 'No search yet'}</span>
        </h2>
        {run?.stage && <span className="mono muted">{run.stage}</span>}
      </div>
      {error && <div className="banner err" role="alert" style={{ marginTop: 12 }}><AlertTriangle size={20} aria-hidden /><div className="grow">{error}</div></div>}
      {run && <>
        <div className="stats">
          <div className="stat"><b>{run.usage.searches}</b><span className="mono">query attempts</span></div>
          <div className="stat"><b>{run.usage.fetchedUrls}</b><span className="mono">URL attempts</span></div>
          <div className="stat"><b>{run.usage.modelCalls}</b><span className="mono">Groq calls</span></div>
          {(run.usage.agentRuns ?? 0) > 0 && <div className="stat"><b>{run.usage.agentRuns}</b><span className="mono">Agent reads · ~${(run.usage.agentCostUsd ?? 0).toFixed(2)}</span></div>}
        </div>
        {live&&Number.isFinite(remaining)&&<p className="mono">Results appear as they are found · each search wraps up within about {DISCOVERY_WIND_DOWN_MS/60000} minutes ({wrap}s left) and keeps any extra leads for Search more.</p>}
        <p className="hint">Bounded search: results cover the queries below, not every program that exists.</p>
        {run.errors.length > 0 && <div className="banner" role="status"><AlertTriangle size={20} aria-hidden /><div className="grow">
          <strong>Search notes ({run.errors.length})</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{run.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div></div>}
        <details className="src"><summary>Coverage: {run.coverage.length} quer{run.coverage.length === 1 ? 'y' : 'ies'}</summary>
          {run.coverage.length ? <ul className="scroll-list">{run.coverage.map((c, i) => <li key={i}><span className="mono">p{c.page}</span> {c.query}</li>)}</ul> : <p className="muted">No queries recorded yet.</p>}
        </details>
        <details className="src"><summary>Sources checked: {run.sourceStatus.length}</summary>
          {run.sourceStatus.length ? <ul className="scroll-list">{run.sourceStatus.map((s, i) => <li key={i}><span className="tag">{s.state}</span> <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></li>)}</ul> : <p className="muted">No sources checked yet.</p>}
        </details>
      </>}
      <div className="actions">
        {live && <button type="button" className="btn hot" onClick={() => void cancel()}><CircleStop size={18} aria-hidden />Cancel search</button>}
        {finished && run.continuation && <button type="button" className="btn lime" onClick={() => void search(run.continuation!)}><Plus size={18} aria-hidden />Search more</button>}
        {(finished && ['failed', 'cancelled', 'partial'].includes(run.status) || (!live && (error || searchUnavailable || !run))) &&
          <button type="button" className="btn" onClick={() => void search()}><RefreshCw size={18} aria-hidden />{searchUnavailable || !run && !progress.runId ? 'Start a new search' : 'Retry search'}</button>}
      </div>
      {finished && run.continuation && <p className="hint">Search more uses one more bounded run and continues from the coverage above.</p>}
      {searchUnavailable && <p className="hint">The previous search can no longer be continued. Your preferences, saved listings and targets are unchanged. Starting a new search uses another bounded run; it never starts automatically.</p>}
    </section>
  );
}
