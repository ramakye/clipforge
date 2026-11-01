import { useEffect, useId, useRef, useState, useCallback } from 'react';

export function Logo({ href, size = 28 }) {
  const mark = (
    <>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#E23B2E" />
        <path fill="#fff" d="M12.1 9.2c-.7-.4-1.5.1-1.5.9v11.8c0 .8.8 1.3 1.5.9l9.6-5.9c.6-.4.6-1.3 0-1.7l-9.6-6z" />
        <path d="M15.2 6.8 18.6 25.2" stroke="#E23B2E" strokeWidth="1.8" />
      </svg>
      <span className="wordmark">CLIP<span>FORGE</span></span>
    </>
  );
  if (href) {
    return <a className="logo" href={href}>{mark}</a>;
  }
  return <div className="logo">{mark}</div>;
}

export function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#fff" d="M6 3.8v10.4c0 .7.8 1.1 1.4.7l7.2-5.2c.5-.4.5-1.1 0-1.5L7.4 3.1C6.8 2.7 6 3.1 6 3.8z" />
    </svg>
  );
}

export function Button({ variant = 'secondary', size, block, className = '', type = 'button', ...props }) {
  const classes = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
}

export function Alert({ tone = 'error', title, children, id }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'} id={id}>
      {title && <p className="alert-title">{title}</p>}
      {children && <div className="alert-body">{children}</div>}
    </div>
  );
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, label }) {
  const indeterminate = value == null || Number.isNaN(value);
  const width = indeterminate ? undefined : `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div
      className={`progress${indeterminate ? ' indeterminate' : ''}`}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuetext={label}
    >
      <span style={width ? { width } : undefined} />
    </div>
  );
}

export function JobSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-thumb" />
      <div className="skeleton-lines">
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    </div>
  );
}

export function Dialog({ open, title, children, onClose }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      <div className="sheet-body">{children}</div>
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </dialog>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((list) => [...list, { id, ...toast }]);
  }, []);
  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

function ToastCard({ toast, onDismiss }) {
  const remaining = useRef(8000);
  const started = useRef(Date.now());
  const [paused, setPaused] = useState(false);
  const tone = toast.tone || 'success';

  useEffect(() => {
    if (paused) {
      remaining.current -= Date.now() - started.current;
      return undefined;
    }
    started.current = Date.now();
    const id = setTimeout(() => onDismiss(toast.id), Math.max(0, remaining.current));
    return () => clearTimeout(id);
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      className={`toast toast-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="toast-copy">
        <strong>{toast.title}</strong>
        {toast.detail && <p>{toast.detail}</p>}
        {toast.href && (
          <a href={toast.href} target="_blank" rel="noopener">{toast.hrefLabel || 'Download'}</a>
        )}
      </div>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)}>
        Close
      </button>
    </div>
  );
}

export function ToastRegion({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-region">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
