import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function ReportButton() {
  return (
    <Link
      to="/weekly-report"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-pink-500 text-white font-semibold shadow-lg hover:opacity-95 transition-opacity"
    >
      <BarChart3 className="w-5 h-5" />
      Generar reporte semanal
    </Link>
  );
}
