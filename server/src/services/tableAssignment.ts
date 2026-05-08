import { getDb } from '../db/database';
import { intervalsOverlap } from '../utils/time';

export interface TableRow {
  id: number;
  name: string;
  capacity: number;
}

export interface TableGroupRow {
  id: number;
  name: string;
  table_ids: number[];
  combined_capacity: number;
}

export interface ReservationInterval {
  id: number;
  start_time: Date;
  end_time: Date;
  table_ids: number[];
}

export interface AssignmentResult {
  ok: true;
  table_ids: number[];
  table_names: string[];
  combined: boolean;
}

export interface AssignmentFailure {
  ok: false;
  reason: 'too_large' | 'no_capacity';
}

export type AssignmentOutcome = AssignmentResult | AssignmentFailure;

/**
 * Findet freie Tische für (start, end, partySize).
 * Strategie:
 *   1. Kleinster freier Einzeltisch mit capacity >= partySize.
 *   2. Falls keiner: kleinste Tisch-Kombination mit combined_capacity >= partySize, deren alle Tische frei sind.
 *   3. Sonst: Failure.
 *
 * Tische bei dieser Funktion gelten als "frei", wenn sie in keiner Reservierung
 * im überlappenden Zeitraum auftauchen (Status confirmed, walk-in oder no_show wird gefiltert von Aufrufer).
 */
export function pickTables(
  start: Date,
  end: Date,
  partySize: number,
  tables: TableRow[],
  groups: TableGroupRow[],
  reservations: ReservationInterval[],
): AssignmentOutcome {
  const overlapping = reservations.filter(r => intervalsOverlap(start, end, r.start_time, r.end_time));
  const blockedTableIds = new Set<number>();
  for (const r of overlapping) for (const tid of r.table_ids) blockedTableIds.add(tid);

  // 1. Einzeltisch-Suche: kleinster, der passt
  const singleCandidates = tables
    .filter(t => t.capacity >= partySize && !blockedTableIds.has(t.id))
    .sort((a, b) => a.capacity - b.capacity || a.id - b.id);

  if (singleCandidates.length > 0) {
    const t = singleCandidates[0];
    return { ok: true, table_ids: [t.id], table_names: [t.name], combined: false };
  }

  // 2. Kombinationen prüfen (nur wenn Gruppe komplett frei ist)
  const groupCandidates = groups
    .filter(g => g.combined_capacity >= partySize)
    .filter(g => g.table_ids.every(id => !blockedTableIds.has(id)))
    .sort((a, b) => a.combined_capacity - b.combined_capacity || a.id - b.id);

  if (groupCandidates.length > 0) {
    const g = groupCandidates[0];
    const names = g.table_ids
      .map(id => tables.find(t => t.id === id)?.name)
      .filter((n): n is string => !!n);
    return { ok: true, table_ids: g.table_ids, table_names: names, combined: true };
  }

  // 3. Failure: too_large wenn selbst bei voller Verfügbarkeit nichts passen würde,
  //    sonst no_capacity (es gäbe theoretisch passende, aber alle belegt).
  const maxSingle = Math.max(0, ...tables.map(t => t.capacity));
  const maxGroup = Math.max(0, ...groups.map(g => g.combined_capacity));
  const maxPossible = Math.max(maxSingle, maxGroup);
  if (partySize > maxPossible) return { ok: false, reason: 'too_large' };
  return { ok: false, reason: 'no_capacity' };
}

export async function loadTablesAndGroups(): Promise<{
  tables: TableRow[];
  groups: TableGroupRow[];
}> {
  const db = getDb();
  const [tablesRes, groupsRes] = await Promise.all([
    db.query('SELECT id, name, capacity FROM tables WHERE active = true ORDER BY sort_order, id'),
    db.query('SELECT id, name, table_ids, combined_capacity FROM table_groups WHERE active = true'),
  ]);
  return {
    tables: tablesRes.rows,
    groups: groupsRes.rows,
  };
}

/**
 * Lädt alle aktiven Reservierungen, die im Zeitraum [start - 1 Tag, end + 1 Tag] liegen.
 * "Aktiv" = confirmed oder walk_in (also Tisch belegt). Cancelled/no_show belegen nichts.
 */
export async function loadReservationsAround(start: Date, end: Date): Promise<ReservationInterval[]> {
  const db = getDb();
  const lower = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const upper = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const res = await db.query(
    `SELECT id, start_time, end_time, table_ids
     FROM reservations
     WHERE status IN ('confirmed')
       AND start_time < $2
       AND end_time > $1`,
    [lower.toISOString(), upper.toISOString()],
  );

  return res.rows.map(r => ({
    id: r.id,
    start_time: new Date(r.start_time),
    end_time: new Date(r.end_time),
    table_ids: r.table_ids,
  }));
}
