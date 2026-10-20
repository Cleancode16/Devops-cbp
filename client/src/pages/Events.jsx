import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Clock,
  MapPin,
  Plus,
  ScanLine,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import api, { errorMessage } from '../api.js';
import {
  Alert,
  CapacityBar,
  DateBadge,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatusBadge,
  Toast,
} from '../components/ui.jsx';
import {
  capacityInfo,
  coverFor,
  formatDate,
  formatTime,
  localDateTimeInputValue,
} from '../lib/format.js';

const emptyForm = { title: '', date: '', venue: '', capacity: '' };

function CreateEventForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/events', {
        title: form.title.trim(),
        date: new Date(form.date).toISOString(),
        venue: form.venue.trim(),
        capacity: Number(form.capacity),
      });
      onCreated(data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="title" label="Event title" icon={Ticket}>
        <input
          id="title"
          name="title"
          className="input pl-10"
          placeholder="DevOps Meetup 2026"
          value={form.title}
          onChange={onChange}
          maxLength={120}
          autoFocus
          required
        />
      </Field>
      <Field id="venue" label="Venue" icon={MapPin}>
        <input
          id="venue"
          name="venue"
          className="input pl-10"
          placeholder="Main Hall, Building A"
          value={form.venue}
          onChange={onChange}
          maxLength={120}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field id="date" label="Date & time" icon={CalendarDays}>
          <input
            id="date"
            name="date"
            type="datetime-local"
            className={`input pl-10 ${form.date ? '' : 'text-slate-500'}`}
            min={localDateTimeInputValue()}
            value={form.date}
            onChange={onChange}
            required
          />
        </Field>
        <Field id="capacity" label="Capacity" icon={Users}>
          <input
            id="capacity"
            name="capacity"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className="input pl-10"
            placeholder="100"
            value={form.capacity}
            onChange={onChange}
            required
          />
        </Field>
      </div>

      {error && <Alert title="Could not create event">{error}</Alert>}

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary sm:min-w-[160px]" disabled={saving}>
          {saving ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {saving ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </form>
  );
}

function EventCard({ event }) {
  const { status } = capacityInfo(event);
  const full = status === 'full';
  return (
    <article className="group relative flex animate-fade-in flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10">
      <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${coverFor(event.id)}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
        <Ticket
          className="absolute -right-5 -top-6 h-32 w-32 rotate-12 text-white/15 transition duration-500 group-hover:rotate-6 group-hover:scale-110"
          aria-hidden="true"
        />
        <div className="absolute right-3 top-3 rounded-full bg-slate-950/50 backdrop-blur-md">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <DateBadge date={event.date} className="-mt-8" />
        <h3
          className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-white"
          title={event.title}
        >
          {event.title}
        </h3>
        <div className="mt-2 space-y-1.5 text-sm text-slate-400">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span className="truncate">
              {formatDate(event.date)} · {formatTime(event.date)}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span className="truncate" title={event.venue}>
              {event.venue}
            </span>
          </p>
        </div>

        <div className="mt-5">
          <CapacityBar event={event} />
        </div>

        <div className="mt-auto pt-5">
          {full ? (
            <span
              className="btn-secondary w-full cursor-not-allowed opacity-60"
              aria-disabled="true"
            >
              Sold out
            </span>
          ) : (
            <Link to={`/events/${event.id}/register`} className="btn-primary w-full">
              Get a pass
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({ icon: Icon, label, value, loading }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3 backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-indigo-300 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-white sm:text-2xl">
          {loading ? (
            <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/10" />
          ) : (
            value
          )}
        </p>
        <p className="mt-1 truncate text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Hero({ onCreate, stats, loading }) {
  return (
    <section className="relative mb-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-slate-900/70 to-fuchsia-600/10 p-6 shadow-2xl shadow-black/40 sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
      />

      <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            HMAC-signed · single-use passes
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Host events.
            <br />
            <span className="text-gradient">Check guests in instantly.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
            Create an event, let people register, and every attendee gets a tamper-proof QR pass
            that works exactly once.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary h-12 px-6 text-base" onClick={onCreate}>
              <CalendarPlus className="h-5 w-5" aria-hidden="true" />
              Create event
            </button>
            <Link to="/verify" className="btn-secondary h-12 px-6 text-base">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
              Verify a pass
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Stat icon={CalendarDays} label="Events" value={stats.events} loading={loading} />
          <Stat icon={Users} label="Registered" value={stats.registered} loading={loading} />
          <Stat icon={Ticket} label="Seats left" value={stats.seatsLeft} loading={loading} />
        </div>
      </div>
    </section>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const clearToast = useCallback(() => setToast(''), []);

  const onCreated = (event) => {
    setModalOpen(false);
    setToast(`"${event.title}" created`);
    load(true);
  };

  const stats = {
    events: events.length,
    registered: events.reduce((sum, e) => sum + e.registeredCount, 0),
    seatsLeft: events.reduce((sum, e) => sum + capacityInfo(e).left, 0),
  };

  return (
    <>
      <Hero onCreate={openModal} stats={stats} loading={loading} />

      <section aria-labelledby="events-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="events-heading" className="text-xl font-semibold tracking-tight text-white">
              All events
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {loading
                ? 'Loading…'
                : `${events.length} ${events.length === 1 ? 'event' : 'events'}, soonest first`}
            </p>
          </div>
          {!loading && events.length > 0 && (
            <button type="button" className="btn-secondary" onClick={openModal}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">New event</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-80" />
            ))}
          </div>
        ) : error ? (
          <Alert title="Could not load events" onRetry={() => load()}>
            {error}
          </Alert>
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No events yet"
            description="Create your first event and start handing out QR passes in seconds."
            action={
              <button type="button" className="btn-primary" onClick={openModal}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create your first event
              </button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        icon={CalendarPlus}
        title="Create event"
        description="Seats are reserved atomically, so an event is never overbooked."
      >
        <CreateEventForm onCreated={onCreated} onCancel={closeModal} />
      </Modal>

      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
