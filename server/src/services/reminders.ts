import { getDb } from '../db/database';
import { sendReminder } from './email';

/** Löscht abgelaufene Admin-Sessions. Gibt die Anzahl gelöschter Zeilen zurück. */
export async function cleanupExpiredAdminSessions(): Promise<number> {
  const db = getDb();
  const result = await db.query('DELETE FROM admin_sessions WHERE expires_at < NOW()');
  return result.rowCount ?? 0;
}

export async function processReminders(): Promise<{ sent24: number; sent4: number }> {
  const db = getDb();
  const now = new Date();

  const result = await db.query(
    `SELECT r.id, r.customer_name, r.customer_email, r.party_size,
            r.start_time, r.end_time, r.table_ids, r.cancellation_token,
            r.reminder_24h_sent_at, r.reminder_4h_sent_at
     FROM reservations r
     WHERE r.status = 'confirmed'
       AND r.customer_email IS NOT NULL
       AND r.start_time > $1
       AND (r.reminder_24h_sent_at IS NULL OR r.reminder_4h_sent_at IS NULL)`,
    [now.toISOString()],
  );

  let sent24 = 0;
  let sent4 = 0;

  for (const row of result.rows) {
    const start = new Date(row.start_time);
    const end = new Date(row.end_time);
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    const tableNamesRes = await db.query('SELECT name FROM tables WHERE id = ANY($1::int[]) ORDER BY id', [row.table_ids]);
    const tableNames = tableNamesRes.rows.map(r => r.name);

    if (!row.reminder_24h_sent_at && hoursUntil > 23 && hoursUntil <= 25) {
      try {
        await sendReminder({
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          partySize: row.party_size,
          startTime: start,
          endTime: end,
          tableNames,
          cancellationToken: row.cancellation_token,
          hoursUntil: 24,
        });
        await db.query('UPDATE reservations SET reminder_24h_sent_at = NOW() WHERE id = $1', [row.id]);
        sent24++;
      } catch (err) {
        console.error(`24h-Reminder für #${row.id} fehlgeschlagen:`, err);
      }
    }

    if (!row.reminder_4h_sent_at && hoursUntil > 3.5 && hoursUntil <= 4.5) {
      try {
        await sendReminder({
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          partySize: row.party_size,
          startTime: start,
          endTime: end,
          tableNames,
          cancellationToken: row.cancellation_token,
          hoursUntil: 4,
        });
        await db.query('UPDATE reservations SET reminder_4h_sent_at = NOW() WHERE id = $1', [row.id]);
        sent4++;
      } catch (err) {
        console.error(`4h-Reminder für #${row.id} fehlgeschlagen:`, err);
      }
    }
  }

  if (sent24 > 0 || sent4 > 0) {
    console.log(`⏰ Reminder versendet: ${sent24}× 24h, ${sent4}× 4h`);
  }
  return { sent24, sent4 };
}
