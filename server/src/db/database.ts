import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL ist nicht gesetzt. Bitte in der .env-Datei konfigurieren.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  try {
    const tablesRes = await db.query('SELECT COUNT(*)::int AS count FROM tables WHERE active = true');
    const tableCount = tablesRes.rows[0]?.count ?? 0;

    if (tableCount === 0) {
      console.warn('⚠️  Keine aktiven Tische gefunden. Bitte im Admin-Dashboard Tische anlegen oder migration.sql ausführen.');
    } else {
      console.log(`✅ Datenbank verbunden. ${tableCount} aktive Tische.`);
    }

    await ensureAdminUser();
  } catch (err: any) {
    if (err.code === '42P01') {
      console.error('❌ Schema fehlt – bitte erst server/src/db/migration.sql in Supabase ausführen!');
      console.error('   Anleitung: SUPABASE_SETUP.md');
      throw new Error('Schema fehlt – migration.sql nicht ausgeführt');
    }
    throw err;
  }
}

async function ensureAdminUser(): Promise<void> {
  const db = getDb();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn('⚠️  ADMIN_PASSWORD nicht gesetzt – Admin-Login wird nicht funktionieren.');
    return;
  }

  const existing = await db.query('SELECT id, password_hash FROM admin_users WHERE username = $1', ['admin']);

  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', ['admin', hash]);
    console.log('✅ Admin-User angelegt (Username: admin, Passwort: aus .env)');
    return;
  }

  const ok = await bcrypt.compare(password, existing.rows[0].password_hash);
  if (!ok) {
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE admin_users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
    console.log('🔐 Admin-Passwort aus .env aktualisiert.');
  }
}
