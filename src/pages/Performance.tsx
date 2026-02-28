import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import PerformanceVideollamadas from '@/pages/performance/PerformanceVideollamadas';
import PerformanceLlamadas from '@/pages/performance/PerformanceLlamadas';
import PerformanceChats from '@/pages/performance/PerformanceChats';
import clsx from 'clsx';

const tabs = [
  { path: '/performance', label: 'Videollamadas', end: true },
  { path: '/performance/llamadas', label: 'Llamadas', end: false },
  { path: '/performance/chats', label: 'Chats', end: false },
];

export default function Performance() {
  const location = useLocation();

  return (
    <>
      <PageHeader
        title="Rendimiento"
        subtitle="Llamadas, videollamadas y chats"
      />
      <div className="px-4 md:px-6 border-b border-surface-500">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(({ path, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={clsx(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                (end ? location.pathname === path : location.pathname.startsWith(path))
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1">
        <Routes>
          <Route index element={<PerformanceVideollamadas />} />
          <Route path="llamadas" element={<PerformanceLlamadas />} />
          <Route path="chats" element={<PerformanceChats />} />
        </Routes>
      </div>
    </>
  );
}
