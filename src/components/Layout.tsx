import { useState, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import InsightsChat from './InsightsChat';
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  TrendingUp,
  Settings,
  Menu,
  X,
  MessageSquare,
  UserCog,
} from 'lucide-react';
import clsx from 'clsx';
import ReportButton from './ReportButton';

const InsightsContext = createContext<{ open: () => void } | null>(null);
export function useInsights() {
  const ctx = useContext(InsightsContext);
  return ctx;
}

const nav = [
  { path: '/', label: 'Panel ejecutivo', icon: LayoutDashboard },
  { path: '/performance', label: 'Rendimiento', icon: BarChart3 },
  { path: '/asesor', label: 'Panel asesor', icon: UserCheck },
  { path: '/acquisition', label: 'Resumen adquisición', icon: TrendingUp },
  { path: '/system', label: 'Control del sistema', icon: Settings },
  { path: '/configuracion', label: 'Configuración', icon: UserCog },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)]">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col w-56 bg-surface-800/95 backdrop-blur-sm border-r border-surface-500 shrink-0 shadow-[2px_0_24px_-8px_rgba(0,240,255,0.12)]">
        <div className="p-4 border-b border-surface-500/80">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg text-white">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-glow-cyan">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Lead Compass</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 shadow-glow-cyan'
                  : 'text-gray-400 hover:bg-surface-600 hover:text-white border border-transparent'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-3 bg-surface-800 border-b border-surface-500">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-surface-600"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link to="/" className="font-display font-semibold text-white">Lead Compass</Link>
        <div className="w-10" />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-surface-800/98 backdrop-blur-sm border-r border-surface-500 transform transition-transform md:hidden shadow-[4px_0_32px_-8px_rgba(0,0,0,0.5)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-surface-500/80 flex items-center justify-between">
          <span className="font-display font-semibold text-white">Lead Compass</span>
          <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-surface-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-2">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                  : 'text-gray-400 hover:bg-surface-600 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-24">
        {children}
      </main>

      {/* Chat FAB - visible en Executive y Asesor */}
      {(location.pathname === '/' || location.pathname === '/asesor') && (
        <button
          type="button"
          onClick={() => setInsightsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-600/95 backdrop-blur border border-accent-cyan/30 text-sm text-white hover:bg-accent-cyan/20 hover:border-accent-cyan/50 shadow-glow-cyan transition-all"
          title="Resumen y análisis"
        >
          <MessageSquare className="w-5 h-5 text-accent-cyan" />
          <span className="hidden sm:inline">Resumen</span>
        </button>
      )}

      {insightsOpen && <InsightsChat onClose={() => setInsightsOpen(false)} />}

      {/* Fixed button: Generar reporte semanal */}
      <ReportButton />
    </div>
  );
}
