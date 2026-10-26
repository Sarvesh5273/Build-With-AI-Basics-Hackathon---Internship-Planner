import { useEffect, useId, useRef, type ReactNode } from 'react';

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, danger }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onCancel(); }}>
      <h2 id={titleId}>{title}</h2>
      <div>{children}</div>
      <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel} autoFocus>Cancel</button>
        <button type="button" className={`btn ${danger ? 'hot' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
