import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CircleCheckBig,
  CircleX,
  ClipboardPaste,
  Clock,
  Eraser,
  MapPin,
  ScanLine,
  SearchX,
  ShieldCheck,
  TriangleAlert,
  User,
  WifiOff,
} from 'lucide-react';
import api, { errorMessage } from '../api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { formatDateTime } from '../lib/format.js';

const kinds = {
  success: {
    icon: CircleCheckBig,
    title: 'Checked in',
    subtitle: 'Welcome! This pass is now marked as used.',
    box: 'border-emerald-500/40 bg-emerald-500/10',
    iconCls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    titleCls: 'text-emerald-200',
  },
  used: {
    icon: TriangleAlert,
    title: 'Pass already used',
    subtitle: 'This pass was checked in before and cannot be reused.',
    box: 'border-amber-500/40 bg-amber-500/10',
    iconCls: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
    titleCls: 'text-amber-200',
  },
  invalid: {
    icon: CircleX,
    title: 'Invalid pass',
    subtitle: 'The token is malformed or has been tampered with.',
    box: 'border-rose-500/40 bg-rose-500/10',
    iconCls: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    titleCls: 'text-rose-200',
  },
  notFound: {
    icon: SearchX,
    title: 'Pass not found',
    subtitle: 'The signature is valid, but no registration matches this pass.',
    box: 'border-rose-500/40 bg-rose-500/10',
    iconCls: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    titleCls: 'text-rose-200',
  },
  network: {
    icon: WifiOff,
    title: 'Cannot reach the server',
    subtitle: 'Check your connection and try again.',
    box: 'border-rose-500/40 bg-rose-500/10',
    iconCls: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    titleCls: 'text-rose-200',
  },
};

function toResult(status, data, err) {
  if (status === 200) return { kind: 'success', data };
  if (status === 409) return { kind: 'used', data };
  if (status === 404) return { kind: 'notFound' };
  if (status === 401 || status === 400) return { kind: 'invalid' };
  if (!status) return { kind: 'network', message: errorMessage(err) };
  return { kind: 'invalid', message: errorMessage(err) };
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-sm text-slate-400 sm:w-32">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm font-medium text-slate-100">{children}</dd>
    </div>
  );
}

function Result({ result }) {
  const k = kinds[result.kind];
  const Icon = k.icon;
  const { data } = result;
  return (
    <div className={`animate-fade-in rounded-2xl border p-5 sm:p-6 ${k.box}`}>
      <div className="flex items-center gap-4">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 ${k.iconCls}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={`text-lg font-semibold ${k.titleCls}`}>{k.title}</p>
          <p className="text-sm text-slate-300">{result.message || k.subtitle}</p>
        </div>
      </div>

      {data && (data.name || data.event) && (
        <dl className="mt-5 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/40 px-4">
          {data.name && (
            <Row icon={User} label="Attendee">
              {data.name}
            </Row>
          )}
          {data.event && (
            <>
              <Row icon={ScanLine} label="Event">
                {data.event.title}
              </Row>
              <Row icon={CalendarDays} label="Event date">
                {formatDateTime(data.event.date)}
              </Row>
              <Row icon={MapPin} label="Venue">
                {data.event.venue}
              </Row>
            </>
          )}
          {data.checkedInAt && (
            <Row icon={Clock} label="Checked in">
              {formatDateTime(data.checkedInAt)}
            </Row>
          )}
        </dl>
      )}
    </div>
  );
}

export default function Verify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const [token, setToken] = useState(urlToken);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const autoRan = useRef(false);
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  const verify = useCallback(async (value) => {
    setLoading(true);
    setResult(null);
    try {
      const { status, data } = await api.post('/verify', { token: value.trim() });
      setResult(toResult(status, data));
    } catch (err) {
      setResult(toResult(err?.response?.status, err?.response?.data, err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify once when opened from the QR link (?token=...).
  // The ref stops React StrictMode's double effect from checking the pass in twice, and the
  // token is removed from the URL so a page refresh does not re-submit it.
  useEffect(() => {
    if (urlToken && !autoRan.current) {
      autoRan.current = true;
      verify(urlToken);
      setSearchParams({}, { replace: true });
    }
  }, [urlToken, verify, setSearchParams]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) verify(token);
  };

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setToken(text.trim());
    } catch {
      // permission denied — user can still paste manually
    }
  };

  const onClear = () => {
    setToken('');
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={ScanLine}
        title="Verify pass"
        description="Scan the QR code with a phone camera, or paste the pass token below."
      />

      <form onSubmit={onSubmit} className="card p-5 sm:p-6">
        <label className="label" htmlFor="token">
          Pass token
        </label>
        <textarea
          id="token"
          rows={4}
          className="input resize-none font-mono text-xs leading-relaxed"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJyaWQiOiI2N…"
          spellCheck={false}
          autoComplete="off"
        />

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            {canPaste && (
              <button type="button" onClick={onPaste} className="btn-secondary flex-1 sm:flex-none">
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                Paste
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              className="btn-ghost flex-1 sm:flex-none"
              disabled={!token && !result}
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          </div>
          <button
            type="submit"
            className="btn-primary w-full sm:ml-auto sm:w-auto"
            disabled={loading || !token.trim()}
          >
            {loading ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {loading ? 'Verifying…' : 'Verify pass'}
          </button>
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        {loading && (
          <div className="card flex animate-fade-in items-center justify-center gap-3 p-6 text-sm text-slate-400">
            <Spinner className="h-5 w-5" />
            Checking pass…
          </div>
        )}
        {!loading && result && <Result result={result} />}
      </div>
    </div>
  );
}
