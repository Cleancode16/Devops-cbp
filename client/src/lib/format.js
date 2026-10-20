const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });

export const formatDate = (value) => dateFmt.format(new Date(value));
export const formatTime = (value) => timeFmt.format(new Date(value));
export const formatDateTime = (value) => dateTimeFmt.format(new Date(value));
export const monthShort = (value) => monthFmt.format(new Date(value)).toUpperCase();
export const dayOfMonth = (value) => new Date(value).getDate();

// Current local time formatted for <input type="datetime-local" min=...>.
export function localDateTimeInputValue(date = new Date()) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Seats left, fill percentage and a status used for badges/progress colours.
export function capacityInfo(event) {
  const left = Math.max(event.capacity - event.registeredCount, 0);
  const pct = event.capacity
    ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100))
    : 0;
  const status = left === 0 ? 'full' : pct >= 80 ? 'almost' : 'open';
  return { left, pct, status };
}

// Each event gets a stable cover gradient derived from its id.
const covers = [
  'from-indigo-500 via-violet-500 to-purple-600',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-sky-500 via-blue-500 to-indigo-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-violet-500 via-fuchsia-500 to-pink-500',
];
export const coverFor = (id) =>
  covers[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % covers.length];
