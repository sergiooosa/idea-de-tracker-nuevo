import { useState, useRef, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

const WEEKDAYS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

function monthDays(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const firstDow = start.getDay();
  const padStart = firstDow;
  const padEnd = 42 - days.length - padStart;
  const before: Date[] = [];
  for (let i = 1; i <= padStart; i++) {
    before.push(new Date(start));
    before[before.length - 1].setDate(start.getDate() - i);
  }
  before.reverse();
  const after: Date[] = [];
  for (let i = 1; i <= padEnd; i++) {
    after.push(new Date(end));
    after[after.length - 1].setDate(end.getDate() + i);
  }
  return { before, days, after };
}

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onRange,
  defaultFrom,
  defaultTo,
}: {
  dateFrom: string;
  dateTo: string;
  onRange: (from: string, to: string) => void;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<string>(dateFrom);
  const [tempTo, setTempTo] = useState<string>(dateTo);
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(dateFrom ? parseISO(dateFrom) : new Date()));
  const [rightMonth, setRightMonth] = useState(() => startOfMonth(addMonths(leftMonth, 1)));
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTempFrom(dateFrom);
    setTempTo(dateTo);
    setLeftMonth(startOfMonth(dateFrom ? parseISO(dateFrom) : new Date()));
    setRightMonth(startOfMonth(addMonths(leftMonth, 1)));
    setSelecting('from');
  }, [open, dateFrom, dateTo]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const apply = () => {
    let from = tempFrom;
    let to = tempTo;
    if (from && to && from > to) {
      [from, to] = [to, from];
    }
    onRange(from, to);
    setOpen(false);
  };

  const reset = () => {
    const to = defaultTo ? parseISO(defaultTo) : new Date();
    const from = defaultFrom ? parseISO(defaultFrom) : subDays(to, 7);
    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');
    setTempFrom(fromStr);
    setTempTo(toStr);
    onRange(fromStr, toStr);
    setLeftMonth(startOfMonth(from));
    setRightMonth(startOfMonth(addMonths(from, 1)));
    setSelecting('from');
  };

  const setQuickRange = (days: number) => {
    const to = new Date();
    const from = days === 0 ? to : subDays(to, days);
    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');
    setTempFrom(fromStr);
    setTempTo(toStr);
    onRange(fromStr, toStr);
    setLeftMonth(startOfMonth(from));
    setRightMonth(startOfMonth(addMonths(from, 1)));
    setSelecting('from');
  };

  const handleDayClick = (d: Date) => {
    const str = format(d, 'yyyy-MM-dd');
    if (selecting === 'from') {
      setTempFrom(str);
      setTempTo(str);
      setSelecting('to');
    } else {
      if (str < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(str);
      } else {
        setTempTo(str);
      }
      setSelecting('from');
    }
  };

  const rangeStart = tempFrom ? startOfDay(parseISO(tempFrom)) : null;
  const rangeEnd = tempTo ? startOfDay(parseISO(tempTo)) : null;

  const renderCalendar = (month: Date) => {
    const { before, days, after } = monthDays(month);
    const all = [...before, ...days, ...after];
    return (
      <div className="calendar-month">
        <div className="grid grid-cols-7 gap-px text-center text-[11px] text-gray-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {all.map((d, i) => {
            const isOther = !isSameMonth(d, month);
            const isStart = rangeStart && isSameDay(d, rangeStart);
            const isEnd = rangeEnd && isSameDay(d, rangeEnd);
            const inRange =
              rangeStart &&
              rangeEnd &&
              !isStart &&
              !isEnd &&
              isWithinInterval(d, { start: rangeStart, end: rangeEnd });
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(d)}
                className={`
                  w-8 h-8 text-sm rounded-full flex items-center justify-center
                  ${isOther ? 'text-gray-600' : 'text-gray-200'}
                  ${isStart || isEnd ? 'bg-blue-500 text-white' : ''}
                  ${inRange ? 'bg-blue-500/30' : ''}
                  ${!isStart && !isEnd && !inRange ? 'hover:bg-surface-600' : ''}
                `}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2" ref={ref}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-700/80 p-1 border border-surface-500">
        <button
          type="button"
          onClick={() => setQuickRange(0)}
          className="px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setQuickRange(7)}
          className="px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          Últimos 7 días
        </button>
        <button
          type="button"
          onClick={() => setQuickRange(30)}
          className="px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-surface-600 text-gray-300 hover:text-white"
        >
          30 días
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-surface-700 border border-surface-500 px-2 py-1.5">
        <input
          type="date"
          value={dateFrom}
          readOnly
          onClick={() => setOpen(true)}
          className="bg-transparent text-sm text-white w-32 border-none outline-none cursor-pointer"
        />
        <span className="text-gray-500">→</span>
        <input
          type="date"
          value={dateTo}
          readOnly
          onClick={() => setOpen(true)}
          className="bg-transparent text-sm text-white w-32 border-none outline-none cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-1 rounded text-gray-400 hover:text-white"
          aria-label="Abrir calendario"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={reset}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent-red/20 text-accent-red hover:bg-accent-red/30"
      >
        Restablecer
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-xl bg-surface-800 border border-surface-500 shadow-xl p-4">
          <div className="flex gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setLeftMonth(subMonths(leftMonth, 1))}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ‹
                </button>
                <span className="text-sm font-medium text-gray-300 capitalize">
                  {format(leftMonth, 'MMM yyyy', { locale: es })}
                </span>
                <button
                  type="button"
                  onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ›
                </button>
              </div>
              {renderCalendar(leftMonth)}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setRightMonth(subMonths(rightMonth, 1))}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ‹
                </button>
                <span className="text-sm font-medium text-gray-300 capitalize">
                  {format(rightMonth, 'MMM yyyy', { locale: es })}
                </span>
                <button
                  type="button"
                  onClick={() => setRightMonth(addMonths(rightMonth, 1))}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ›
                </button>
              </div>
              {renderCalendar(rightMonth)}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 mb-2">
            Elige la fecha que quieras ver.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
