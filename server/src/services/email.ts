import nodemailer, { Transporter } from 'nodemailer';
import { bookingConfirmationEmail, cancellationEmail, reminderEmail } from './email-templates';
import { getSettings } from './settings';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('⚠️  SMTP nicht konfiguriert – Emails werden nur in der Konsole geloggt.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/** Parst SMTP_FROM ("Name <mail@x.de>" oder "mail@x.de") in { name, email }. */
function parseFrom(): { name: string; email: string } {
  const raw = (process.env.SMTP_FROM || process.env.BREVO_FROM || process.env.SMTP_USER || '').trim();
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() };
  return { name: raw || 'Restaurant', email: raw };
}

/**
 * Beim Serverstart aufrufen: prüft, ob ein E-Mail-Versandweg korrekt
 * konfiguriert ist, und loggt das Ergebnis eindeutig (im Render-Log sichtbar).
 */
export async function verifyEmailSetup(): Promise<void> {
  // Bevorzugter Weg: Brevo HTTP-API (Port 443, von Plattformen nicht blockiert)
  if (process.env.BREVO_API_KEY) {
    try {
      const r = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
      });
      if (r.ok) {
        console.log(`✅ Brevo aktiv (Absender ${parseFrom().email}) – E-Mail-Versand über HTTP-API bereit.`);
      } else {
        console.error(
          `❌ BREVO_API_KEY gesetzt, aber Brevo lehnt ihn ab (HTTP ${r.status}). ` +
            `Mails werden NICHT versendet. API-Key im Render-Dashboard prüfen.`,
        );
      }
    } catch (err: any) {
      console.error(`❌ Brevo-Verbindung fehlgeschlagen: ${err.message}. Mails werden NICHT versendet.`);
    }
    return;
  }

  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn(
      `⚠️  Kein E-Mail-Versand konfiguriert (weder BREVO_API_KEY noch SMTP: fehlt ${missing.join(', ')}). ` +
        `Mails werden NICHT versendet, nur geloggt. → Für Render BREVO_API_KEY setzen ` +
        `(SMTP wird dort i.d.R. blockiert).`,
    );
    return;
  }
  const t = getTransporter();
  if (!t) return;
  try {
    await t.verify();
    console.log(`✅ SMTP aktiv (${process.env.SMTP_HOST} als ${process.env.SMTP_USER}) – E-Mail-Versand bereit.`);
  } catch (err: any) {
    console.error(
      `❌ SMTP konfiguriert, aber Verbindung/Login fehlgeschlagen: ${err.message}. ` +
        `Mails werden NICHT versendet. App-Passwort & SMTP_* im Render-Dashboard prüfen.`,
    );
  }
}

function getBaseUrl(): string {
  return (process.env.BASE_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
}

async function buildContext() {
  const s = await getSettings();
  return {
    restaurantName: s.restaurant_name,
    restaurantAddress: s.address || '',
    restaurantPhone: s.contact_phone || '',
    restaurantMapsUrl: s.maps_url || '',
  };
}

interface BookingEmailParams {
  customerName: string;
  customerEmail: string;
  partySize: number;
  startTime: Date;
  endTime: Date;
  tableNames: string[];
  cancellationToken: string;
}

export async function sendBookingConfirmation(p: BookingEmailParams): Promise<void> {
  const ctx = await buildContext();
  const { subject, html, text } = bookingConfirmationEmail({
    customerName: p.customerName,
    partySize: p.partySize,
    startTime: p.startTime,
    endTime: p.endTime,
    tableNames: p.tableNames,
    cancellationUrl: `${getBaseUrl()}/storno/${p.cancellationToken}`,
    ...ctx,
  });
  await sendMail(p.customerEmail, subject, html, text);
}

interface ReminderParams {
  customerName: string;
  customerEmail: string;
  partySize: number;
  startTime: Date;
  endTime: Date;
  tableNames: string[];
  cancellationToken: string;
  hoursUntil: 24 | 4;
}

export async function sendReminder(p: ReminderParams): Promise<void> {
  const ctx = await buildContext();
  const { subject, html, text } = reminderEmail({
    customerName: p.customerName,
    partySize: p.partySize,
    startTime: p.startTime,
    endTime: p.endTime,
    tableNames: p.tableNames,
    cancellationUrl: `${getBaseUrl()}/storno/${p.cancellationToken}`,
    hoursUntil: p.hoursUntil,
    ...ctx,
  });
  await sendMail(p.customerEmail, subject, html, text);
}

interface CancellationParams {
  customerName: string;
  customerEmail: string;
  partySize: number;
  startTime: Date;
}

export async function sendCancellationConfirmation(p: CancellationParams): Promise<void> {
  const ctx = await buildContext();
  const { subject, html, text } = cancellationEmail({
    customerName: p.customerName,
    partySize: p.partySize,
    startTime: p.startTime,
    ...ctx,
  });
  await sendMail(p.customerEmail, subject, html, text);
}

/** Versand über Brevo HTTP-API (HTTPS/443 – wird von Render & Co. nicht blockiert). */
async function sendViaBrevo(to: string, subject: string, html: string, text: string): Promise<void> {
  const sender = parseFrom();
  const replyToEmail = process.env.REPLY_TO || sender.email;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        replyTo: { email: replyToEmail },
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (r.ok) {
      console.log(`✉️  Email (Brevo) an ${to} gesendet: ${subject}`);
    } else {
      const body = await r.text().catch(() => '');
      console.error(`❌ Brevo-Versand an ${to} fehlgeschlagen (HTTP ${r.status}): ${body}`);
    }
  } catch (err) {
    console.error(`❌ Brevo-Versand an ${to} fehlgeschlagen:`, err);
  }
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, html, text);
    return;
  }

  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
  const replyTo = process.env.REPLY_TO || process.env.SMTP_USER || from;

  if (!t) {
    const divider = '─'.repeat(70);
    console.log(`\n📧 [DEV] SMTP nicht konfiguriert – Email wird nur geloggt:`);
    console.log(divider);
    console.log(`Von:     ${from}`);
    console.log(`An:      ${to}`);
    console.log(`Betreff: ${subject}`);
    console.log(divider);
    console.log(text);
    console.log(divider + '\n');
    return;
  }

  try {
    await t.sendMail({ from, to, subject, html, text, replyTo, envelope: { from: process.env.SMTP_USER, to } });
    console.log(`✉️  Email an ${to} gesendet: ${subject}`);
  } catch (err) {
    console.error(`❌ Email-Versand an ${to} fehlgeschlagen:`, err);
  }
}
