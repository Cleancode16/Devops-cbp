import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CalendarX,
  Clock,
  Mail,
  MapPin,
  ShieldCheck,
  Ticket,
  User,
} from 'lucide-react';
import api, { errorMessage } from '../api.js';
import {
  Alert,
  CapacityBar,
  DateBadge,
  EmptyState,
  Field,
  Spinner,
  StatusBadge,
} from '../components/ui.jsx';
import { capacityInfo, coverFor, formatDate, formatTime } from '../lib/format.js';

function BackLink() {
  return (
    <Link
      to="/"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      All events
    </Link>
  );
}

function Detail({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2.5 text-sm text-slate-300">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export default function Register() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // There is no GET /events/:id route — load the list and pick the event.
  useEffect(() => {
    api
      .get('/events')
      .then(({ data }) => {
        const found = data.find((e) => e.id === id);
        if (found) setEvent(found);
        else setNotFound(true);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await api.post('/register', {
        eventId: id,
        name: name.trim(),
        email: email.trim(),
      });
      navigate('/pass', { state: { ...data, name: name.trim(), event } });
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <BackLink />
        <div className="grid gap-6 md:grid-cols-5">
          <div className="skeleton h-72 md:col-span-2" />
          <div className="skeleton h-72 md:col-span-3" />
        </div>
      </>
    );
  }

  if (error || notFound) {
    return (
      <>
        <BackLink />
        {error ? (
          <Alert title="Could not load the event">{error}</Alert>
        ) : (
          <EmptyState
            icon={CalendarX}
            title="Event not found"
            description="This event may have been removed or the link is wrong."
            action={
              <Link to="/" className="btn-primary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to events
              </Link>
            }
          />
        )}
      </>
    );
  }

  const { status } = capacityInfo(event);
  const isFull = status === 'full';

  return (
    <>
      <BackLink />
      <div className="grid items-start gap-6 md:grid-cols-5">
        <section
          className="card animate-fade-in overflow-hidden md:col-span-2"
          aria-label="Event details"
        >
          <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${coverFor(event.id)}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
            <Ticket
              className="absolute -right-5 -top-6 h-32 w-32 rotate-12 text-white/15"
              aria-hidden="true"
            />
            <div className="absolute right-3 top-3 rounded-full bg-slate-950/50 backdrop-blur-md">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
            <DateBadge date={event.date} className="-mt-8" />
            <h1 className="mt-3 break-words text-xl font-semibold tracking-tight text-white">
              {event.title}
            </h1>
            <div className="mt-5 grid gap-3">
              <Detail icon={CalendarDays}>{formatDate(event.date)}</Detail>
              <Detail icon={Clock}>{formatTime(event.date)}</Detail>
              <Detail icon={MapPin}>{event.venue}</Detail>
            </div>
            <div className="mt-6">
              <CapacityBar event={event} />
            </div>
          </div>
        </section>

        <section
          className="card animate-fade-in p-5 sm:p-6 md:col-span-3"
          aria-label="Registration"
        >
          <h2 className="text-lg font-semibold text-white">Your details</h2>
          <p className="mt-1 text-sm text-slate-400">
            We will generate a QR pass for you right away.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <Field id="name" label="Full name" icon={User}>
              <input
                id="name"
                className="input pl-10"
                placeholder="Ada Lovelace"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isFull}
                required
              />
            </Field>
            <Field id="email" label="Email" icon={Mail} hint="One pass per email for each event.">
              <input
                id="email"
                type="email"
                className="input pl-10"
                placeholder="ada@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isFull}
                required
              />
            </Field>

            {isFull && <Alert title="This event is full">All seats have been taken.</Alert>}
            {submitError && <Alert title="Registration failed">{submitError}</Alert>}

            <button type="submit" className="btn-primary w-full" disabled={submitting || isFull}>
              {submitting ? <Spinner /> : <Ticket className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Generating your pass…' : 'Get my pass'}
            </button>

            <p className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden="true" />
              Your pass is cryptographically signed and can be checked in only once.
            </p>
          </form>
        </section>
      </div>
    </>
  );
}
