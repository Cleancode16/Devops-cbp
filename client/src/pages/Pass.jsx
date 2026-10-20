import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Download,
  MapPin,
  ScanLine,
  Ticket,
  TicketX,
  User,
} from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';
import { formatDate, formatTime } from '../lib/format.js';

// Clipboard API needs a secure context (https/localhost); fall back to execCommand elsewhere.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function Info({ icon: Icon, label, children, wide }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-0.5 break-words font-medium text-slate-100">{children}</p>
    </div>
  );
}

export default function Pass() {
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);

  if (!state?.token) {
    return (
      <EmptyState
        icon={TicketX}
        title="No pass to show"
        description="Passes are shown right after registering. Register for an event to get one."
        action={
          <Link to="/" className="btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Browse events
          </Link>
        }
      />
    );
  }

  const { token, qr, name, event } = state;
  const fileName = `eventpass-${(event?.title || 'pass').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

  const onCopy = async () => {
    try {
      await copyText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <p
        role="status"
        className="mb-5 flex items-center justify-center gap-2 text-sm font-medium text-emerald-300"
      >
        <CircleCheck className="h-5 w-5" aria-hidden="true" />
        You&apos;re registered! Here is your pass.
      </p>

      <article className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-indigo-950/50">
        <header className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-6 text-white">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            Event pass
          </p>
          <h1 className="mt-3 break-words text-2xl font-semibold leading-tight">
            {event?.title || 'Your event'}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
            <User className="h-4 w-4" aria-hidden="true" />
            {name}
          </p>
        </header>

        {event && (
          <div className="grid grid-cols-2 gap-4 p-6 text-sm">
            <Info icon={CalendarDays} label="Date">
              {formatDate(event.date)}
            </Info>
            <Info icon={Clock} label="Time">
              {formatTime(event.date)}
            </Info>
            <Info icon={MapPin} label="Venue" wide>
              {event.venue}
            </Info>
          </div>
        )}

        {/* ticket perforation */}
        <div className="relative flex items-center" aria-hidden="true">
          <span className="absolute -left-3 h-6 w-6 rounded-full border border-white/10 bg-slate-950" />
          <div className="mx-5 w-full border-t-2 border-dashed border-white/10" />
          <span className="absolute -right-3 h-6 w-6 rounded-full border border-white/10 bg-slate-950" />
        </div>

        <div className="flex flex-col items-center p-6">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <img
              src={qr}
              alt="QR code for your event pass"
              className="h-52 w-52 sm:h-60 sm:w-60"
              width="240"
              height="240"
            />
          </div>
          <p className="mt-4 max-w-xs text-center text-xs text-slate-400">
            Show this code at the entrance. It can be scanned once.
          </p>
        </div>

        <div className="border-t border-white/5 p-6">
          <p className="label">Pass token</p>
          <div className="flex gap-2">
            <code
              className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 font-mono text-xs text-slate-300"
              title={token}
            >
              {token}
            </code>
            <button
              type="button"
              onClick={onCopy}
              className="btn-secondary shrink-0 px-3"
              aria-label={copied ? 'Token copied' : 'Copy token'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={qr} download={fileName} className="btn-secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Save QR
            </a>
            <Link to="/verify" className="btn-secondary">
              <ScanLine className="h-4 w-4" aria-hidden="true" />
              Verify page
            </Link>
          </div>
        </div>
      </article>

      <div className="mt-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to events
        </Link>
      </div>
    </div>
  );
}
