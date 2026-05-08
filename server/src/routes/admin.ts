import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/database';
import { requireAdmin } from '../middleware/auth';
import { getSettings, invalidateSettingsCache, durationFor } from '../services/settings';
import { checkSlotAvailable } from '../services/availability';
import { addMinutes, combineDateAndTime, dateOnly } from '../utils/time';
import { loadReservationsAround, loadTablesAndGroups, pickTables } from '../services/tableAssignment';

const router = Router();

// =============================================================
// Auth
// =============================================================
router.post('/login', async (req, res) => {
  const schema = z.object({ password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Passwort fehlt' });
    return;
  }

  const db = getDb();
  const userRes = await db.query('SELECT id, password_hash FROM admin_users WHERE username = $1', ['admin']);
  if (userRes.rowCount === 0) {
    res.status(500).json({ error: 'Admin-User nicht initialisiert' });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, userRes.rows[0].password_hash);
  if (!ok) {
    res.status(401).json({ error: 'Falsches Passwort' });
    return;
  }

  const token = uuidv4();
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await db.query('INSERT INTO admin_sessions (token, expires_at) VALUES ($1, $2)', [token, expires]);

  res.json({ token, expires_at: expires.toISOString() });
});

router.post('/logout', requireAdmin, async (req, res) => {
  const auth = req.headers.authorization!;
  const token = auth.slice('Bearer '.length).trim();
  await getDb().query('DELETE FROM admin_sessions WHERE token = $1', [token]);
  res.json({ ok: true });
});

router.get('/session', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

// =============================================================
// Dashboard: Reservierungen für einen Tag
// =============================================================
router.get('/reservations', requireAdmin, async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : dateOnly(new Date());
  const db = getDb();

  const result = await db.query(
    `SELECT r.id, r.customer_name, r.customer_email, r.customer_phone, r.party_size,
            r.start_time, r.end_time, r.table_ids, r.status, r.walk_in, r.notes,
            r.cancellation_token, r.created_at
     FROM reservations r
     WHERE r.start_time >= $1::date
       AND r.start_time < ($1::date + INTERVAL '1 day')
     ORDER BY r.start_time ASC, r.id ASC`,
    [date],
  );

  res.json({ date, reservations: result.rows });
});

// Reservierungen-Liste über Datumsbereich (für Wochenansicht / Suche)
router.get('/reservations/range', requireAdmin, async (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : dateOnly(new Date());
  const to = typeof req.query.to === 'string' ? req.query.to : from;
  const db = getDb();

  const result = await db.query(
    `SELECT id, customer_name, party_size, start_time, end_time, status, walk_in, table_ids
     FROM reservations
     WHERE start_time >= $1::date
       AND start_time < ($2::date + INTERVAL '1 day')
     ORDER BY start_time ASC`,
    [from, to],
  );

  res.json({ reservations: result.rows });
});

// Manuell Reservierung anlegen (mit oder ohne Auto-Tisch-Zuweisung)
router.post('/reservations', requireAdmin, async (req, res) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    party_size: z.number().int().min(1).max(50),
    customer_name: z.string().trim().min(1),
    customer_email: z.string().trim().email().optional().or(z.literal('')),
    customer_phone: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
    walk_in: z.boolean().optional(),
    table_ids: z.array(z.number().int()).optional(),
    duration_minutes: z.number().int().min(15).max(480).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const settings = await getSettings();

  const start = combineDateAndTime(data.date, data.time);
  const duration = data.duration_minutes ?? durationFor(data.party_size, settings);
  const end = addMinutes(start, duration);

  let tableIds = data.table_ids;
  if (!tableIds || tableIds.length === 0) {
    const { tables, groups } = await loadTablesAndGroups();
    const reservations = await loadReservationsAround(start, end);
    const outcome = pickTables(start, end, data.party_size, tables, groups, reservations);
    if (!outcome.ok) {
      res.status(409).json({ error: 'Kein passender Tisch frei' });
      return;
    }
    tableIds = outcome.table_ids;
  } else {
    // Manuell ausgewählte Tische: Konflikte prüfen
    const reservations = await loadReservationsAround(start, end);
    const conflicting = reservations.find(
      r => r.start_time < end && r.end_time > start && r.table_ids.some(t => tableIds!.includes(t)),
    );
    if (conflicting) {
      res.status(409).json({ error: 'Mindestens ein Tisch ist in diesem Zeitraum bereits belegt' });
      return;
    }
  }

  const db = getDb();
  const cancellationToken = uuidv4();
  const insertRes = await db.query(
    `INSERT INTO reservations
       (customer_name, customer_email, customer_phone, party_size, start_time, end_time,
        table_ids, status, walk_in, notes, cancellation_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10)
     RETURNING *`,
    [
      data.customer_name,
      data.customer_email || null,
      data.customer_phone || null,
      data.party_size,
      start.toISOString(),
      end.toISOString(),
      tableIds,
      data.walk_in ?? false,
      data.notes || null,
      cancellationToken,
    ],
  );

  res.status(201).json(insertRes.rows[0]);
});

// Reservierung bearbeiten
router.patch('/reservations/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    customer_name: z.string().trim().min(1).optional(),
    customer_email: z.string().trim().email().optional().or(z.literal('')),
    customer_phone: z.string().trim().optional().or(z.literal('')),
    party_size: z.number().int().min(1).max(50).optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    table_ids: z.array(z.number().int()).optional(),
    status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
    notes: z.string().optional().or(z.literal('')),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
    return;
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    fields.push(`${k} = $${idx++}`);
    values.push(v === '' ? null : v);
  }
  if (fields.length === 0) {
    res.status(400).json({ error: 'Keine Änderungen' });
    return;
  }
  fields.push(`updated_at = NOW()`);
  values.push(id);

  const db = getDb();
  const result = await db.query(
    `UPDATE reservations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Reservierung nicht gefunden' });
    return;
  }
  res.json(result.rows[0]);
});

// Reservierung löschen
router.delete('/reservations/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await getDb().query('DELETE FROM reservations WHERE id = $1', [id]);
  res.json({ ok: true });
});

// =============================================================
// Live-Tisch-Status (für Floor Plan im Dashboard)
// Status pro Tisch jetzt: 'free' | 'reserved' (zukünftig heute) | 'occupied' (läuft gerade)
// =============================================================
router.get('/tables/status', requireAdmin, async (_req, res) => {
  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [tablesRes, reservationsRes] = await Promise.all([
    db.query(
      `SELECT id, name, capacity, pos_x, pos_y, width, height, shape, sort_order
       FROM tables WHERE active = true ORDER BY sort_order, id`,
    ),
    db.query(
      `SELECT id, customer_name, party_size, start_time, end_time, table_ids, walk_in
       FROM reservations
       WHERE status = 'confirmed'
         AND start_time < $2
         AND end_time > $1
       ORDER BY start_time ASC`,
      [todayStart.toISOString(), todayEnd.toISOString()],
    ),
  ]);

  const reservations = reservationsRes.rows.map(r => ({
    ...r,
    start_time: new Date(r.start_time),
    end_time: new Date(r.end_time),
  }));

  const tablesWithStatus = tablesRes.rows.map(t => {
    const current = reservations.find(
      r => r.table_ids.includes(t.id) && r.start_time <= now && r.end_time > now,
    );
    const upcoming = reservations
      .filter(r => r.table_ids.includes(t.id) && r.start_time > now)
      .sort((a, b) => a.start_time.getTime() - b.start_time.getTime())[0];

    let status: 'free' | 'reserved' | 'occupied' = 'free';
    if (current) status = 'occupied';
    else if (upcoming) status = 'reserved';

    return {
      ...t,
      status,
      current_reservation: current
        ? {
            id: current.id,
            customer_name: current.customer_name,
            party_size: current.party_size,
            end_time: current.end_time.toISOString(),
            walk_in: current.walk_in,
          }
        : null,
      next_reservation: upcoming
        ? {
            id: upcoming.id,
            customer_name: upcoming.customer_name,
            party_size: upcoming.party_size,
            start_time: upcoming.start_time.toISOString(),
          }
        : null,
    };
  });

  res.json({ tables: tablesWithStatus, now: now.toISOString() });
});

// Tisch sofort als belegt markieren (Walk-in ohne Reservierung)
router.post('/tables/:id/seat', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    party_size: z.number().int().min(1).max(50),
    duration_minutes: z.number().int().min(15).max(480).default(90),
    customer_name: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const data = parsed.data;

  const db = getDb();
  const tableRes = await db.query('SELECT id, name FROM tables WHERE id = $1 AND active = true', [id]);
  if (tableRes.rowCount === 0) {
    res.status(404).json({ error: 'Tisch nicht gefunden' });
    return;
  }

  const start = new Date();
  const end = addMinutes(start, data.duration_minutes);

  // Konflikt-Check
  const conflict = await db.query(
    `SELECT id FROM reservations
     WHERE status = 'confirmed' AND $1 = ANY(table_ids)
       AND start_time < $3 AND end_time > $2`,
    [id, start.toISOString(), end.toISOString()],
  );
  if (conflict.rowCount && conflict.rowCount > 0) {
    res.status(409).json({ error: 'Tisch ist in diesem Zeitraum bereits belegt' });
    return;
  }

  const insertRes = await db.query(
    `INSERT INTO reservations
       (customer_name, party_size, start_time, end_time, table_ids, status, walk_in, notes, cancellation_token)
     VALUES ($1,$2,$3,$4,$5,'confirmed',true,$6,$7) RETURNING *`,
    [
      data.customer_name || 'Walk-in',
      data.party_size,
      start.toISOString(),
      end.toISOString(),
      [id],
      data.notes || null,
      uuidv4(),
    ],
  );
  res.status(201).json(insertRes.rows[0]);
});

// Aktuelle Belegung eines Tisches sofort beenden (Gäste früher weg)
router.post('/tables/:id/free', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const now = new Date();
  const result = await db.query(
    `UPDATE reservations
     SET end_time = $2, status = 'completed', updated_at = NOW()
     WHERE status = 'confirmed' AND $1 = ANY(table_ids)
       AND start_time <= $2 AND end_time > $2
     RETURNING id`,
    [id, now.toISOString()],
  );
  res.json({ updated: result.rowCount, now: now.toISOString() });
});

// =============================================================
// CRUD: Tische
// =============================================================
router.get('/tables', requireAdmin, async (_req, res) => {
  const db = getDb();
  const result = await db.query(
    `SELECT id, name, capacity, pos_x, pos_y, width, height, shape, active, sort_order
     FROM tables ORDER BY sort_order, id`,
  );
  res.json(result.rows);
});

router.post('/tables', requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    capacity: z.number().int().min(1).max(50),
    pos_x: z.number().int().default(50),
    pos_y: z.number().int().default(50),
    width: z.number().int().default(80),
    height: z.number().int().default(80),
    shape: z.enum(['rect', 'circle']).default('rect'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const d = parsed.data;
  const db = getDb();
  try {
    const result = await db.query(
      `INSERT INTO tables (name, capacity, pos_x, pos_y, width, height, shape, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(MAX(sort_order),0)+1 FROM tables))
       RETURNING *`,
      [d.name, d.capacity, d.pos_x, d.pos_y, d.width, d.height, d.shape],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Tischname existiert bereits' });
      return;
    }
    throw err;
  }
});

router.patch('/tables/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().trim().min(1).optional(),
    capacity: z.number().int().min(1).max(50).optional(),
    pos_x: z.number().int().optional(),
    pos_y: z.number().int().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    shape: z.enum(['rect', 'circle']).optional(),
    active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }
  if (fields.length === 0) {
    res.status(400).json({ error: 'Keine Änderungen' });
    return;
  }
  values.push(id);
  const result = await getDb().query(
    `UPDATE tables SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Tisch nicht gefunden' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/tables/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();

  const futureRes = await db.query(
    `SELECT COUNT(*)::int AS count FROM reservations
     WHERE status = 'confirmed' AND end_time > NOW() AND $1 = ANY(table_ids)`,
    [id],
  );
  const futureCount = futureRes.rows[0]?.count ?? 0;
  if (futureCount > 0) {
    res.status(409).json({
      error: `Tisch ist noch in ${futureCount} aktiven Reservierung(en) verplant. Bitte erst stornieren oder umbuchen.`,
    });
    return;
  }

  await db.query('DELETE FROM table_groups WHERE $1 = ANY(table_ids)', [id]);
  await db.query('DELETE FROM tables WHERE id = $1', [id]);
  res.json({ ok: true });
});

// Bulk-Update von Positionen (für Drag&Drop im Floor Plan – ein einziger Save)
router.post('/tables/bulk-positions', requireAdmin, async (req, res) => {
  const schema = z.object({
    updates: z.array(
      z.object({
        id: z.number().int(),
        pos_x: z.number().int(),
        pos_y: z.number().int(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const db = getDb();
  for (const u of parsed.data.updates) {
    await db.query(
      `UPDATE tables SET pos_x = $1, pos_y = $2,
        width = COALESCE($3, width), height = COALESCE($4, height)
       WHERE id = $5`,
      [u.pos_x, u.pos_y, u.width ?? null, u.height ?? null, u.id],
    );
  }
  res.json({ ok: true, updated: parsed.data.updates.length });
});

// =============================================================
// CRUD: Tisch-Kombinationen
// =============================================================
router.get('/groups', requireAdmin, async (_req, res) => {
  const result = await getDb().query(
    `SELECT id, name, table_ids, combined_capacity, active FROM table_groups ORDER BY id`,
  );
  res.json(result.rows);
});

router.post('/groups', requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    table_ids: z.array(z.number().int()).min(2),
    combined_capacity: z.number().int().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const d = parsed.data;
  const result = await getDb().query(
    `INSERT INTO table_groups (name, table_ids, combined_capacity) VALUES ($1,$2,$3) RETURNING *`,
    [d.name, d.table_ids, d.combined_capacity],
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/groups/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().trim().min(1).optional(),
    table_ids: z.array(z.number().int()).min(2).optional(),
    combined_capacity: z.number().int().min(1).optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
  }
  if (fields.length === 0) {
    res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
    return;
  }
  values.push(id);
  const result = await getDb().query(
    `UPDATE table_groups SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Kombination nicht gefunden' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/groups/:id', requireAdmin, async (req, res) => {
  await getDb().query('DELETE FROM table_groups WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

// =============================================================
// CRUD: Feiertage
// =============================================================
router.get('/holidays', requireAdmin, async (_req, res) => {
  const result = await getDb().query('SELECT id, date, name FROM holidays ORDER BY date');
  res.json(result.rows);
});

router.post('/holidays', requireAdmin, async (req, res) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().trim().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' });
    return;
  }
  try {
    const result = await getDb().query(
      `INSERT INTO holidays (date, name) VALUES ($1,$2) RETURNING *`,
      [parsed.data.date, parsed.data.name],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Datum bereits als Feiertag eingetragen' });
      return;
    }
    throw err;
  }
});

router.delete('/holidays/:id', requireAdmin, async (req, res) => {
  await getDb().query('DELETE FROM holidays WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

// =============================================================
// Settings
// =============================================================
router.get('/settings', requireAdmin, async (_req, res) => {
  const s = await getSettings(true);
  res.json(s);
});

router.put('/settings', requireAdmin, async (req, res) => {
  const schema = z.object({
    restaurant_name: z.string().trim().min(1).optional(),
    contact_email: z.string().trim().email().optional().or(z.literal('')),
    contact_phone: z.string().trim().optional().or(z.literal('')),
    address: z.string().trim().optional().or(z.literal('')),
    maps_url: z.string().trim().optional().or(z.literal('')),
    opening_hours: z.record(z.string(), z.union([z.tuple([z.string(), z.string()]), z.null()])).optional(),
    duration_short_min: z.number().int().min(15).max(480).optional(),
    duration_long_min: z.number().int().min(15).max(480).optional(),
    party_size_threshold: z.number().int().min(1).max(50).optional(),
    max_party_size_online: z.number().int().min(1).max(50).optional(),
    min_lead_minutes: z.number().int().min(0).max(1440).optional(),
    cancellation_deadline_hours: z.number().int().min(0).max(72).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
    return;
  }
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === 'opening_hours') {
      fields.push(`${k} = $${idx++}::jsonb`);
      values.push(JSON.stringify(v));
    } else {
      fields.push(`${k} = $${idx++}`);
      values.push(v === '' ? null : v);
    }
  }
  if (fields.length === 0) {
    res.json(await getSettings(true));
    return;
  }
  fields.push(`updated_at = NOW()`);
  await getDb().query(
    `UPDATE settings SET ${fields.join(', ')} WHERE id = 1`,
    values,
  );
  invalidateSettingsCache();
  res.json(await getSettings(true));
});

// =============================================================
// Statistik
// =============================================================
router.get('/stats', requireAdmin, async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [totalRes, byDayRes, byHourRes, statusRes] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS total, COALESCE(SUM(party_size),0)::int AS guests
       FROM reservations WHERE start_time >= $1`,
      [since.toISOString()],
    ),
    db.query(
      `SELECT DATE(start_time) AS date, COUNT(*)::int AS count, COALESCE(SUM(party_size),0)::int AS guests
       FROM reservations WHERE start_time >= $1 AND status IN ('confirmed','completed')
       GROUP BY DATE(start_time) ORDER BY date`,
      [since.toISOString()],
    ),
    db.query(
      `SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*)::int AS count
       FROM reservations WHERE start_time >= $1 AND status IN ('confirmed','completed')
       GROUP BY hour ORDER BY hour`,
      [since.toISOString()],
    ),
    db.query(
      `SELECT status, COUNT(*)::int AS count FROM reservations
       WHERE start_time >= $1 GROUP BY status`,
      [since.toISOString()],
    ),
  ]);

  res.json({
    days,
    total: totalRes.rows[0],
    by_day: byDayRes.rows,
    by_hour: byHourRes.rows,
    by_status: statusRes.rows,
  });
});

export default router;
