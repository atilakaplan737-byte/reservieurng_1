import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import 'express-async-errors'; // leitet abgelehnte Promises aus async-Handlern an die Error-Middleware
import cors from 'cors';
import cron from 'node-cron';
import { initDb, getDb } from './db/database';
import infoRouter from './routes/info';
import availabilityRouter from './routes/availability';
import reservationsRouter from './routes/reservations';
import adminRouter from './routes/admin';
import { processReminders } from './services/reminders';
import { verifyEmailSetup } from './services/email';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Health-Check – auch als Ziel für einen externen Keep-Alive-Ping (Render Free
// schläft sonst ein und die Reminder-/Cleanup-Cronjobs laufen nicht).
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/info', infoRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/admin', adminRouter);

// Statische Auslieferung des gebauten Clients in Produktion
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')));
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server-Fehler:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// Tägliche Bereinigung abgelaufener Admin-Sessions
cron.schedule('0 3 * * *', async () => {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM admin_sessions WHERE expires_at < NOW()');
    if (result.rowCount && result.rowCount > 0) {
      console.log(`🧹 ${result.rowCount} abgelaufene Admin-Session(s) bereinigt`);
    }
  } catch (err) {
    console.error('Cron-Cleanup-Fehler:', err);
  }
});

// Reminder-Job (alle 15 Minuten)
cron.schedule('*/15 * * * *', async () => {
  try {
    await processReminders();
  } catch (err) {
    console.error('❌ Reminder-Cron fehlgeschlagen:', err);
  }
});

function validateRequiredEnv(): void {
  const pwd = process.env.ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  if (!pwd || pwd.length < 8) {
    console.error('❌ ADMIN_PASSWORD fehlt oder ist zu kurz (min. 8 Zeichen). Setze einen sicheren Wert.');
    if (isProd) process.exit(1);
  }
  if (isProd && (pwd === 'admin123' || pwd === 'changeme' || pwd === 'password')) {
    console.error('❌ ADMIN_PASSWORD ist ein bekanntes Default-Passwort. In Production unzulässig.');
    process.exit(1);
  }
}

validateRequiredEnv();

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Server läuft auf http://localhost:${PORT}`);
      console.log(`📍 ${process.env.RESTAURANT_NAME || 'Restaurant'}\n`);
      verifyEmailSetup().catch(() => {});
    });
  })
  .catch(err => {
    console.error('❌ Fehler beim Initialisieren der Datenbank:', err);
    process.exit(1);
  });
