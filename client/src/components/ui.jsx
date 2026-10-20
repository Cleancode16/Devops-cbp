import { useEffect } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, RefreshCw, Users, X } from 'lucide-react';
import { capacityInfo, dayOfMonth, monthShort } from '../lib/format.js';

export function Spinner({ className = 'h-4 w-4' }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function PageHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="icon-tile">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-400 sm:text-base">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Alert({ title, children, onRetry }) {
  return (
    <div
      role="alert"
      className="flex animate-fade-in gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
    >
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-rose-100">{title}</p>}
        {children && <p className="break-words">{children}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 font-medium text-rose-100 underline-offset-4 hover:underline"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="relative flex animate-fade-in flex-col items-center overflow-hidden rounded-3xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
      />
      {Icon && (
        <div className="relative mb-5 grid h-16 w-16 animate-float place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-indigo-200 shadow-lg shadow-indigo-500/20">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <h2 className="relative text-lg font-semibold text-white">{title}</h2>
      {description && (
        <p className="relative mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
        )}
        {children}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function DateBadge({ date, className = '' }) {
  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950 leading-none shadow-xl shadow-black/40 ${className}`}
    >
      <span className="text-[11px] font-bold tracking-widest text-indigo-300">
        {monthShort(date)}
      </span>
      <span className="mt-1 text-2xl font-bold text-white">{dayOfMonth(date)}</span>
    </div>
  );
}

const statusStyles = {
  open: {
    label: 'Open',
    cls: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    dot: 'bg-emerald-400',
  },
  almost: {
    label: 'Almost full',
    cls: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    dot: 'bg-amber-400',
  },
  full: {
    label: 'Full',
    cls: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    dot: 'bg-rose-400',
  },
};

export function StatusBadge({ status }) {
  const s = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const barColors = {
  open: 'from-indigo-500 to-violet-400',
  almost: 'from-amber-500 to-orange-400',
  full: 'from-rose-500 to-pink-400',
};

export function CapacityBar({ event }) {
  const { left, pct, status } = capacityInfo(event);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {event.registeredCount} / {event.capacity} registered
        </span>
        <span className="font-medium text-slate-300">
          {left === 0 ? 'No seats left' : `${left} left`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Seats taken"
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barColors[status]}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

// Bottom sheet on phones, centred dialog from sm up. Closes on Escape / backdrop click.
export function Modal({ open, onClose, icon: Icon, title, description, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 animate-overlay-in bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-h-[92dvh] w-full animate-sheet-in overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-3xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-3xl bg-gradient-to-b from-indigo-500/15 to-transparent" />
        <div className="relative p-5 sm:p-7">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15 sm:hidden" />
          <div className="mb-6 flex items-start gap-3">
            {Icon && (
              <div className="icon-tile">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <p
        role="status"
        className="pointer-events-auto flex animate-sheet-in items-center gap-2.5 rounded-full border border-emerald-400/30 bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-emerald-200 shadow-2xl shadow-black/50 backdrop-blur"
      >
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        {message}
      </p>
    </div>
  );
}
