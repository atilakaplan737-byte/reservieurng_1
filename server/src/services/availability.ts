import { getDb } from '../db/database';
import { addMinutes, combineDateAndTime, dateOnly, parseHM, weekdayOf } from '../utils/time';
import { Settings, durationFor, getSettings } from './settings';
import { loadReservationsAround, loadTablesAndGroups, pickTables } from './tableAssignment';

const SLOT_MINUTES = 30;

export interface SlotAvailability {
  time: string; // "HH:mm"
  start: string; // ISO
  end: string; // ISO
  available: boolean;
}

export interface DayAvailability {
  date: string;
  closed: boolean;
  closed_reason?: string;
  slots: SlotAvailability[];
}

export async function getDayAvailability(dateStr: string, partySize: number): Promise<DayAvailability> {
  const settings = await getSettings();
  const db = getDb();

  // Datum prüfen
  const target = combineDateAndTime(dateStr, '00:00');
  const todayDateOnly = dateOnly(new Date());
  if (dateStr < todayDateOnly) {
    return { date: dateStr, closed: true, closed_reason: 'Datum liegt in der Vergangenheit', slots: [] };
  }

  // Feiertag?
  const holidayRes = await db.query('SELECT name FROM holidays WHERE date = $1', [dateStr]);
  if (holidayRes.rows.length > 0) {
    return { date: dateStr, closed: true, closed_reason: `Geschlossen: ${holidayRes.rows[0].name}`, slots: [] };
  }

  // Öffnungszeiten?
  const wd = weekdayOf(target);
  const oh = settings.opening_hours[String(wd)];
  if (!oh) {
    return { date: dateStr, closed: true, closed_reason: 'An diesem Tag haben wir geschlossen.', slots: [] };
  }

  // Über Online-Limit? → komplett zumachen, Frontend zeigt "bitte anrufen"
  if (partySize > settings.max_party_size_online) {
    return {
      date: dateStr,
      closed: true,
      closed_reason: `Für Gruppen ab ${settings.max_party_size_online + 1} Personen rufen Sie uns bitte an.`,
      slots: [],
    };
  }

  const { h: openH, m: openM } = parseHM(oh[0]);
  const { h: closeH, m: closeM } = parseHM(oh[1]);
  const open = new Date(target);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(target);
  close.setHours(closeH, closeM, 0, 0);

  const duration = durationFor(partySize, settings);
  const minBookable = addMinutes(new Date(), settings.min_lead_minutes);

  const { tables, groups } = await loadTablesAndGroups();
  const reservations = await loadReservationsAround(open, close);

  const slots: SlotAvailability[] = [];
  let cursor = new Date(open);
  while (true) {
    const slotEnd = addMinutes(cursor, duration);
    if (slotEnd > close) break;

    let available = false;
    if (cursor >= minBookable) {
      const outcome = pickTables(cursor, slotEnd, partySize, tables, groups, reservations);
      available = outcome.ok;
    }

    slots.push({
      time: formatHM(cursor),
      start: cursor.toISOString(),
      end: slotEnd.toISOString(),
      available,
    });

    cursor = addMinutes(cursor, SLOT_MINUTES);
  }

  return { date: dateStr, closed: false, slots };
}

export async function checkSlotAvailable(start: Date, end: Date, partySize: number): Promise<{
  ok: boolean;
  table_ids?: number[];
  table_names?: string[];
  combined?: boolean;
  reason?: 'too_large' | 'no_capacity' | 'closed' | 'past' | 'too_late';
}> {
  const settings = await getSettings();
  const db = getDb();

  const dateStr = dateOnly(start);
  const holidayRes = await db.query('SELECT 1 FROM holidays WHERE date = $1', [dateStr]);
  if (holidayRes.rowCount && holidayRes.rowCount > 0) return { ok: false, reason: 'closed' };

  const wd = weekdayOf(start);
  const oh = settings.opening_hours[String(wd)];
  if (!oh) return { ok: false, reason: 'closed' };

  const { h: openH, m: openM } = parseHM(oh[0]);
  const { h: closeH, m: closeM } = parseHM(oh[1]);
  const open = new Date(start);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(start);
  close.setHours(closeH, closeM, 0, 0);

  if (start < open || end > close) return { ok: false, reason: 'closed' };

  const minBookable = addMinutes(new Date(), settings.min_lead_minutes);
  if (start < minBookable) return { ok: false, reason: 'too_late' };

  const { tables, groups } = await loadTablesAndGroups();
  const reservations = await loadReservationsAround(open, close);
  const outcome = pickTables(start, end, partySize, tables, groups, reservations);
  if (!outcome.ok) return { ok: false, reason: outcome.reason };

  return {
    ok: true,
    table_ids: outcome.table_ids,
    table_names: outcome.table_names,
    combined: outcome.combined,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function formatHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getDurationFor(partySize: number, settings: Settings): number {
  return durationFor(partySize, settings);
}
