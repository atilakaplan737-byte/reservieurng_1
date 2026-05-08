import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/database';
import { checkSlotAvailable } from '../services/availability';
import { sendBookingConfirmation, sendCancellationConfirmation } from '../services/email';
import { getSettings, durationFor } from '../services/settings';
import { addMinutes, combineDateAndTime } from '../utils/time';

const router = Router();

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  party_size: z.number().int().min(1).max(50),
  customer_name: z.string().trim().min(2).max(100),
  customer_email: z.string().trim().email().max(150),
  customer_phone: z.string().trim().min(4).max(40),
  notes: z.string().trim().max(500).optional(),
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const settings = await getSettings();

  const start = combineDateAndTime(data.date, data.time);
  const duration = durationFor(data.party_size, settings);
  const end = addMinutes(start, duration);

  const check = await checkSlotAvailable(start, end, data.party_size);
  if (!check.ok) {
    const messages: Record<string, string> = {
      too_large: `Für ${data.party_size} Personen können wir online keinen Tisch reservieren. Bitte rufen Sie uns an.`,
      no_capacity: 'Dieser Zeitraum ist leider belegt. Bitte wählen Sie eine andere Uhrzeit.',
      closed: 'Wir haben zu diesem Zeitpunkt geschlossen.',
      too_late: 'Dieser Zeitpunkt liegt zu kurzfristig in der Zukunft.',
      past: 'Dieser Zeitpunkt liegt in der Vergangenheit.',
    };
    res.status(409).json({ error: messages[check.reason!] || 'Reservierung nicht möglich', reason: check.reason });
    return;
  }

  const db = getDb();
  const cancellationToken = uuidv4();

  try {
    const insertRes = await db.query(
      `INSERT INTO reservations
         (customer_name, customer_email, customer_phone, party_size, start_time, end_time,
          table_ids, status, walk_in, notes, cancellation_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',false,$8,$9)
       RETURNING id`,
      [
        data.customer_name,
        data.customer_email,
        data.customer_phone,
        data.party_size,
        start.toISOString(),
        end.toISOString(),
        check.table_ids,
        data.notes || null,
        cancellationToken,
      ],
    );

    const reservationId = insertRes.rows[0].id;

    // Email asynchron, Fehler nicht zur Reservierung zurückwerfen
    sendBookingConfirmation({
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      partySize: data.party_size,
      startTime: start,
      endTime: end,
      tableNames: check.table_names || [],
      cancellationToken,
    }).catch(err => console.error('Email send failed:', err));

    res.status(201).json({
      id: reservationId,
      cancellation_token: cancellationToken,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration,
      table_names: check.table_names,
      combined: check.combined,
    });
  } catch (err) {
    console.error('reservation insert error', err);
    res.status(500).json({ error: 'Reservierung konnte nicht gespeichert werden' });
  }
});

// Reservierungs-Details per Token (für Storno-Page)
router.get('/by-token/:token', async (req, res) => {
  const db = getDb();
  const result = await db.query(
    `SELECT id, customer_name, customer_email, party_size, start_time, end_time, status, table_ids
     FROM reservations WHERE cancellation_token = $1`,
    [req.params.token],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Reservierung nicht gefunden' });
    return;
  }
  const row = result.rows[0];

  const tableRes = await db.query('SELECT name FROM tables WHERE id = ANY($1::int[])', [row.table_ids]);
  res.json({
    id: row.id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    party_size: row.party_size,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    table_names: tableRes.rows.map(r => r.name),
  });
});

// Stornierung per Token
router.delete('/by-token/:token', async (req, res) => {
  const db = getDb();
  const settings = await getSettings();

  const result = await db.query(
    `SELECT id, customer_name, customer_email, party_size, start_time, end_time, status, table_ids
     FROM reservations WHERE cancellation_token = $1`,
    [req.params.token],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Reservierung nicht gefunden' });
    return;
  }
  const row = result.rows[0];

  const start = new Date(row.start_time);
  const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < settings.cancellation_deadline_hours) {
    res.status(400).json({
      error: `Stornierung nur bis ${settings.cancellation_deadline_hours}h vor der Reservierung möglich. Bitte rufen Sie uns an.`,
    });
    return;
  }

  await db.query(`DELETE FROM reservations WHERE id = $1`, [row.id]);

  if (row.customer_email) {
    sendCancellationConfirmation({
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      partySize: row.party_size,
      startTime: new Date(row.start_time),
    }).catch(err => console.error('Cancel-Email failed:', err));
  }

  res.json({ ok: true });
});

export default router;
