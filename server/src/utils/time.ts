// Datum/Zeit-Helper. Wir arbeiten konsequent mit ISO-Strings + UTC für DB,
// Anzeige passiert immer in Restaurant-Lokalzeit (über Intl.DateTimeFormat im Client).

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoLocal(d: Date): string {
  // YYYY-MM-DDTHH:mm:ss (ohne TZ-Suffix, für Form-Werte)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function dateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseHM(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h, m };
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const { h, m } = parseHM(timeStr);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function weekdayOf(date: Date): number {
  return date.getDay(); // 0 = Sonntag, 6 = Samstag
}
