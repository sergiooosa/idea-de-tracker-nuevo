import { redirect } from 'next/navigation';

// Redirige bookmarks existentes a la nueva ruta /reportes
export default function WeeklyReportRedirect() {
  redirect('/reportes');
}
