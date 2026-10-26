import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';

export function ListEditor({ label, values, onChange, max = 6, maxLength = 120, placeholder, hint, badge }: {
  label: string; values: string[]; onChange: (v: string[]) => void; max?: number; maxLength?: number;
  placeholder?: string; hint?: string; badge?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some(x => x.toLowerCase() === v.toLowerCase())) { setErr('Already in the list.'); return; }
    if (values.length >= max) { setErr(`Up to ${max} entries. Remove one first.`); return; }
    onChange([...values, v.slice(0, maxLength)]); setDraft(''); setErr('');
  };
  return (
    <div>
      <label htmlFor={id}>{label}{badge && <span className="inferred">{badge}</span>}</label>
      {values.length > 0 && (
        <ul className="chips" aria-label={`${label} entries`} style={{ listStyle: 'none', padding: 0 }}>
          {values.map(v => (
            <li key={v} className="chip"><span>{v}</span>
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter(x => x !== v))}><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id={id} type="text" value={draft} maxLength={maxLength} placeholder={placeholder}
          aria-describedby={`${id}-h ${id}-e`} aria-invalid={!!err}
          onChange={e => { setDraft(e.target.value); setErr(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn small" onClick={add} disabled={!draft.trim()} aria-label={`Add to ${label}`}><Plus size={18} /></button>
      </div>
      <p id={`${id}-h`} className="hint">{hint ? `${hint} ` : ''}{values.length}/{max} used.</p>
      <p id={`${id}-e`} className="hint" role="alert" style={{ color: 'var(--vermilion)', fontWeight: 700 }}>{err}</p>
    </div>
  );
}
