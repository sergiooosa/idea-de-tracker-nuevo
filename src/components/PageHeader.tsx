import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-surface-500/80 px-4 py-3 md:px-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backTo && (
            <Link
              to={backTo}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-lg md:text-xl text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
