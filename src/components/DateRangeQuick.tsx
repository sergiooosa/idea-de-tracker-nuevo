import { format, subDays, subMonths } from 'date-fns';

type QuickRange = '7' | '15' | '30';

export default function DateRangeQuick({
  dateFrom,
  dateTo,
  onRange,
}: {
  dateFrom: string;
  dateTo: string;
  onRange: (from: string, to: string) => void;
}) {
  const setQuick = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    onRange(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-400">Rango:</span>
      <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500">
        <button
          type="button"
          onClick={() => setQuick(7)}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          7 días
        </button>
        <button
          type="button"
          onClick={() => setQuick(15)}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          15 días
        </button>
        <button
          type="button"
          onClick={() => setQuick(30)}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          1 mes
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onRange(e.target.value, dateTo)}
          className="rounded-lg bg-surface-700 border border-surface-500 px-2.5 py-1.5 text-sm text-white w-36"
        />
        <span className="text-gray-500">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onRange(dateFrom, e.target.value)}
          className="rounded-lg bg-surface-700 border border-surface-500 px-2.5 py-1.5 text-sm text-white w-36"
        />
      </div>
    </div>
  );
}
