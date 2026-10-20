import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ScanLine, SearchX, Ticket } from 'lucide-react';
import { EmptyState } from './components/ui.jsx';
import Events from './pages/Events.jsx';
import Register from './pages/Register.jsx';
import Pass from './pages/Pass.jsx';
import Verify from './pages/Verify.jsx';

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden min-[360px]:inline">{label}</span>
    </NavLink>
  );
}

function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to="/" className="btn-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to events
        </Link>
      }
    />
  );
}

export default function App() {
  const { pathname } = useLocation();
  const onVerify = pathname.startsWith('/verify');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      {/* background: faint grid fading out + soft colour glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.28),transparent)]"
      />

      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg tracking-tight">
              Event<span className="text-indigo-400">Pass</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1">
            <NavItem to="/" icon={CalendarDays} label="Events" active={!onVerify} />
            <NavItem to="/verify" icon={ScanLine} label="Verify" active={onVerify} />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Routes>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id/register" element={<Register />} />
          <Route path="/pass" element={<Pass />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            EventPass
          </span>
          <span>Signed, single-use QR passes</span>
        </div>
      </footer>
    </div>
  );
}
