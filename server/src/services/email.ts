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

async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || `noreply@${(process.env.RESTAURANT_NAME || 'restaurant').toLowerCase().replace(/\s+/g, '')}.local`;

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
    await t.sendMail({
      from,
      to,
      subject,
      html,
      text,
      replyTo: process.env.SMTP_USER || from,
      headers: {
        'X-Mailer': 'Reservation-System',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });
    console.log(`✉️  Email an ${to} gesendet: ${subject}`);
  } catch (err) {
    console.error(`❌ Email-Versand an ${to} fehlgeschlagen:`, err);
  }
}
