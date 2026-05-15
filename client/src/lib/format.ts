// Restaurant-Zeitzone – fest, damit Zeiten unabhängig von der Browser-Zeitzone
// des Gasts (z.B. Buchung aus dem Ausland) korrekt in Lokalzeit erscheinen
// und mit Admin-Dashboard + E-Mails übereinstimmen.
const RESTAURANT_TZ = 'Europe/Berlin';

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: RESTAURANT_TZ,
  }).format(date);
}

export function fmtDateShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: RESTAURANT_TZ,
  }).format(date);
}

export function fmtTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: RESTAURANT_TZ,
  }).format(date);
}

export function fmtDateTime(d: Date | string): string {
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
