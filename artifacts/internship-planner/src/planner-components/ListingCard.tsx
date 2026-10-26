import { Bookmark, BookmarkCheck, ChevronRight, Eye, EyeOff, ExternalLink, Target } from 'lucide-react';
import type { Fact, RankedListing } from '../../shared/schemas';
import { SourceQuote } from './SourceQuote';
import { factsOf, fmtDate, isOfficial, sourceFor } from './listing-facts';

function FactRow({ listing, label, kinds, unknownText }: { listing: RankedListing; label: string; kinds: Fact['kind'][]; unknownText: string }) {
  const facts = kinds.flatMap(k => factsOf(listing, k));
  return (
    <div className="fact-row">
      <dt>{label}</dt>
      <dd>
        {facts.length === 0 ? <span className="muted">{unknownText}</span> : facts.map((f, i) => {
          const s = sourceFor(listing, f.sourceId);
          const due = f.due ? (f.due.kind === 'rolling' ? 'Rolling' : f.due.kind === 'unknown' ? 'Date not stated' :
            `${fmtDate(f.due.at)}${f.due.kind === 'dateOnly' ? ' (time not stated)' : ''}${f.due.timezone ? ` ${f.due.timezone}` : ''}`) : '';
          const prefix = kinds.length > 1 && f.kind !== kinds[0] ? (f.kind === 'fundingExclusion' ? 'Not covered: ' : f.kind === 'fundingBenefit' ? 'Covers: ' : `${f.kind}: `) : '';
          return (
            <div key={i} className="fact-value">
              <span>{prefix}{due || f.value}</span>
              <SourceQuote compact summary="quote" quote={f.quote} url={s?.url} title={s?.title}
                meta={s ? `${s.official === false ? 'Unverified other source · ' : ''}Read ${fmtDate(s.fetchedAt)} · ${s.freshness}` : undefined} />
            </div>
          );
        })}
      </dd>
    </div>
  );
}

export function ListingCard({ listing: l, selected, saved, hidden, onToggle }: {
  listing: RankedListing; selected: boolean; saved: boolean; hidden: boolean;
  onToggle: (list: 'selected' | 'saved' | 'hidden') => void;
}) {
  const official = isOfficial(l), others = l.sources.filter(s => s.official === false).length;
  return (
    <article className={`card listing ${l.excluded ? 'excluded' : ''} ${selected ? 'is-selected' : ''}`} aria-labelledby={`t-${l.id}`}>
      <div className="listing-head">
        <div>
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            <span className={`tag ${official ? 'ok' : 'warn'}`}>{official ? 'Official source' : 'Other source · unverified'}</span>
            {official && others > 0 && <span className="tag soft">+{others} other source{others === 1 ? '' : 's'}</span>}
            <span className="tag soft">{l.track}</span>
            {l.excluded && <span className="tag bad">excluded</span>}
            {selected && <span className="tag ok">target</span>}
            {hidden && <span className="tag">hidden</span>}
          </div>
          <h3 id={`t-${l.id}`}>{l.title}</h3>
          <p className="muted" style={{ margin: 0 }}>{l.organization}</p>
        </div>
        <div className={`score ${l.score === 0 ? 'zero' : ''}`} aria-label={`Preference fit ${l.score} out of 100`}>
          <b>{l.score}</b><small>pref. fit</small>
        </div>
      </div>
      <dl className="fact-list">
        <FactRow listing={l} label="Deadline" kinds={['deadline']} unknownText="Not stated in the source" />
        <FactRow listing={l} label="Funding" kinds={['funding', 'fundingBenefit', 'fundingExclusion', 'fee']} unknownText="Not confirmed in the source" />
        <FactRow listing={l} label="Visa" kinds={['visa']} unknownText="Not mentioned" />
        <FactRow listing={l} label="Cycle" kinds={['cycle']} unknownText={l.cycleKey ? `Cycle ${l.cycleKey}` : 'Not stated'} />
      </dl>
      <details className="src">
        <summary><ChevronRight className="chev" size={18} aria-hidden />Why it's listed, fit reasons and sources ({l.sources.length})</summary>
        <h4 className="sub">Why this is an opportunity</h4>
        <blockquote className="quote">&ldquo;{l.identityQuote}&rdquo;</blockquote>
        <h4 className="sub">Fit reasons <span className="muted">(preference match, not admission odds)</span></h4>
        <ul className="reasons">{l.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <h4 className="sub">Sources</h4>
        {l.sources.length ? <ul className="reasons">{l.sources.map(s => <li key={s.id} style={{ overflowWrap: 'anywhere' }}>
          <span className={`tag ${s.official === false ? 'warn' : 'ok'}`} style={{ marginRight: 6 }}>{s.official === false ? 'other · unverified' : 'official'}</span>
          <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<span className="sr-only"> (opens in new tab)</span></a><br />
          <span className="mono muted">read {fmtDate(s.fetchedAt)} · {s.freshness} · {s.ownership}</span></li>)}</ul> : <p className="muted">No source metadata available.</p>}
      </details>
      <div className="actions">
        <button type="button" className="btn small" aria-pressed={selected} onClick={() => onToggle('selected')}><Target size={18} aria-hidden />{selected ? 'Selected target' : 'Select as target'}</button>
        <button type="button" className="btn small" aria-pressed={saved} onClick={() => onToggle('saved')}>{saved ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}{saved ? 'Saved' : 'Save'}</button>
        <button type="button" className="btn small" aria-pressed={hidden} onClick={() => onToggle('hidden')}>{hidden ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}{hidden ? 'Unhide' : 'Hide'}</button>
        <a className="btn small ghost" href={l.canonicalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />{official ? 'Official page' : 'Source page'}<span className="sr-only"> (opens in new tab)</span></a>
      </div>
    </article>
  );
}
