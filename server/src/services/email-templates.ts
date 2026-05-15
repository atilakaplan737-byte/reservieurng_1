interface CommonContext {
  customerName: string;
  partySize: number;
  startTime: Date;
  endTime?: Date;
  tableNames?: string[];
  cancellationUrl?: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantMapsUrl: string;
}

// Restaurant-Zeitzone – fest, damit E-Mail-Zeiten unabhängig von der
// Server-Zeitzone (Render läuft in UTC) korrekt in Lokalzeit angezeigt werden.
const RESTAURANT_TZ = process.env.TZ || 'Europe/Berlin';

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: RESTAURANT_TZ,
  }).format(d);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: RESTAURANT_TZ,
  }).format(d);
}

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: RESTAURANT_TZ,
  }).format(d);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
}

function shell(preheader: string, bodyHtml: string, ctx: CommonContext): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escape(ctx.restaurantName)}</title>
<!--[if mso]><style>table,td{font-family:Georgia,serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f1a17;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f1ea;opacity:0;">${escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1ea;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <tr>
          <td align="center" style="padding:40px 32px 32px;border-bottom:1px solid #e8e2d6;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:4px;color:#a08658;text-transform:uppercase;margin-bottom:8px;">Reservierung</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1f1a17;font-weight:400;letter-spacing:1px;">${escape(ctx.restaurantName)}</div>
          </td>
        </tr>
        <tr><td style="padding:40px 32px;">${bodyHtml}</td></tr>
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid #e8e2d6;text-align:center;font-size:12px;color:#8a8378;line-height:1.6;">
            ${escape(ctx.restaurantName)}${ctx.restaurantAddress ? ' · ' + escape(ctx.restaurantAddress) : ''}<br/>
            Diese Nachricht wurde automatisch versendet.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailsBlock(ctx: CommonContext): string {
  const tables = ctx.tableNames && ctx.tableNames.length > 0 ? escape(ctx.tableNames.join(' + ')) : '–';
  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:14px 0;font-size:12px;letter-spacing:1.5px;color:#8a8378;text-transform:uppercase;${last ? '' : 'border-bottom:1px solid #efe9dc;'}">${label}</td>
      <td style="padding:14px 0;font-size:15px;color:#1f1a17;text-align:right;font-weight:500;${last ? '' : 'border-bottom:1px solid #efe9dc;'}">${value}</td>
    </tr>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf7f1;border:1px solid #efe9dc;border-radius:4px;margin:24px 0;">
      <tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Datum', escape(fmtDate(ctx.startTime)))}
          ${row('Uhrzeit', escape(fmtTime(ctx.startTime)) + (ctx.endTime ? ' – ' + escape(fmtTime(ctx.endTime)) + ' Uhr' : ' Uhr'))}
          ${row('Personen', String(ctx.partySize))}
          ${row('Tisch', `<span style="color:#a08658;">${tables}</span>`, true)}
        </table>
      </td></tr>
    </table>`;
}

function venueBlock(ctx: CommonContext): string {
  if (!ctx.restaurantAddress && !ctx.restaurantPhone && !ctx.restaurantMapsUrl) return '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
      <tr><td style="padding:0;">
        <div style="font-size:12px;letter-spacing:1.5px;color:#8a8378;text-transform:uppercase;margin-bottom:10px;">So finden Sie uns</div>
        <div style="font-size:15px;color:#1f1a17;line-height:1.7;">
          ${ctx.restaurantAddress ? escape(ctx.restaurantAddress) + '<br/>' : ''}
          ${ctx.restaurantPhone ? `<a href="tel:${escape(ctx.restaurantPhone.replace(/\s+/g, ''))}" style="color:#1f1a17;text-decoration:none;border-bottom:1px solid #d4c5a0;">${escape(ctx.restaurantPhone)}</a>` : ''}
        </div>
        ${ctx.restaurantMapsUrl ? `<div style="margin-top:12px;"><a href="${escape(ctx.restaurantMapsUrl)}" style="color:#a08658;font-size:14px;text-decoration:none;">Auf Google&nbsp;Maps öffnen →</a></div>` : ''}
      </td></tr>
    </table>`;
}

function cancelButton(url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 8px;">
      <tr><td style="border-radius:4px;background-color:#1f1a17;">
        <a href="${escape(url)}" style="display:inline-block;padding:14px 32px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#ffffff;text-decoration:none;letter-spacing:0.5px;font-weight:500;">
          Reservierung verwalten
        </a>
      </td></tr>
    </table>`;
}

export function bookingConfirmationEmail(ctx: CommonContext): { subject: string; html: string; text: string } {
  const subject = `Bestätigung Ihrer Reservierung – ${fmtDate(ctx.startTime)}, ${fmtTime(ctx.startTime)} Uhr`;
  const preheader = `${ctx.partySize} ${ctx.partySize === 1 ? 'Person' : 'Personen'} · ${fmtDateTime(ctx.startTime)}`;

  const body = `
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1f1a17;letter-spacing:0.5px;">
      Wir freuen uns auf Sie.
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3d342c;line-height:1.7;">
      Liebe/r ${escape(ctx.customerName)},
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#3d342c;line-height:1.7;">
      Ihre Reservierung im ${escape(ctx.restaurantName)} ist bestätigt. Hier nochmal Ihre Details:
    </p>
    ${detailsBlock(ctx)}
    ${venueBlock(ctx)}
    ${
      ctx.cancellationUrl
        ? `<p style="margin:32px 0 0;font-size:14px;color:#8a8378;line-height:1.6;">
             Sollten Sie verhindert sein, bitten wir um Stornierung über den folgenden Link:
           </p>
           ${cancelButton(ctx.cancellationUrl)}`
        : ''
    }
  `;

  const text = `Liebe/r ${ctx.customerName},

Ihre Reservierung im ${ctx.restaurantName} ist bestätigt.

Datum:    ${fmtDate(ctx.startTime)}
Uhrzeit:  ${fmtTime(ctx.startTime)}${ctx.endTime ? ' – ' + fmtTime(ctx.endTime) : ''} Uhr
Personen: ${ctx.partySize}
Tisch:    ${ctx.tableNames?.join(' + ') || '–'}

${ctx.restaurantAddress || ''}
${ctx.restaurantPhone || ''}

${ctx.cancellationUrl ? `Stornieren: ${ctx.cancellationUrl}` : ''}

Wir freuen uns auf Ihren Besuch.
${ctx.restaurantName}`;

  return { subject, html: shell(preheader, body, ctx), text };
}

export function reminderEmail(ctx: CommonContext & { hoursUntil: 24 | 4 }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject =
    ctx.hoursUntil === 24
      ? `Erinnerung: Ihre Reservierung morgen um ${fmtTime(ctx.startTime)} Uhr`
      : `Bald geht's los – Ihr Tisch um ${fmtTime(ctx.startTime)} Uhr`;

  const preheader =
    ctx.hoursUntil === 24
      ? `${fmtDate(ctx.startTime)} · ${ctx.partySize} ${ctx.partySize === 1 ? 'Person' : 'Personen'}`
      : `Heute · ${fmtTime(ctx.startTime)} Uhr · ${ctx.partySize} ${ctx.partySize === 1 ? 'Person' : 'Personen'}`;

  const headline = ctx.hoursUntil === 24 ? 'Bis morgen.' : 'Bis gleich.';

  const intro =
    ctx.hoursUntil === 24
      ? 'wir freuen uns, Sie morgen bei uns begrüßen zu dürfen.'
      : 'in wenigen Stunden ist es soweit. Wir freuen uns auf Ihren Besuch.';

  const body = `
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1f1a17;letter-spacing:0.5px;">
      ${headline}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3d342c;line-height:1.7;">
      Liebe/r ${escape(ctx.customerName)},
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#3d342c;line-height:1.7;">${intro}</p>
    ${detailsBlock(ctx)}
    ${venueBlock(ctx)}
    ${
      ctx.cancellationUrl
        ? `<p style="margin:24px 0 0;font-size:13px;color:#8a8378;line-height:1.6;">
             Sind Sie verhindert? Bitte stornieren Sie <a href="${escape(ctx.cancellationUrl)}" style="color:#a08658;text-decoration:none;border-bottom:1px solid #d4c5a0;">hier</a>, damit wir den Tisch jemand anderem anbieten können.
           </p>`
        : ''
    }
  `;

  const text = `Liebe/r ${ctx.customerName},

${intro}

Datum:    ${fmtDate(ctx.startTime)}
Uhrzeit:  ${fmtTime(ctx.startTime)}${ctx.endTime ? ' – ' + fmtTime(ctx.endTime) : ''} Uhr
Personen: ${ctx.partySize}
Tisch:    ${ctx.tableNames?.join(' + ') || '–'}

${ctx.restaurantAddress || ''}
${ctx.restaurantPhone || ''}

${ctx.cancellationUrl ? `Stornieren: ${ctx.cancellationUrl}` : ''}

${ctx.restaurantName}`;

  return { subject, html: shell(preheader, body, ctx), text };
}

export function cancellationEmail(ctx: CommonContext): { subject: string; html: string; text: string } {
  const subject = `Stornierung bestätigt – ${ctx.restaurantName}`;
  const preheader = `Ihre Reservierung am ${fmtDate(ctx.startTime)} wurde storniert.`;

  const body = `
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1f1a17;letter-spacing:0.5px;">
      Stornierung bestätigt
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#3d342c;line-height:1.7;">
      Liebe/r ${escape(ctx.customerName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#3d342c;line-height:1.7;">
      Ihre Reservierung am ${escape(fmtDateTime(ctx.startTime))} (${ctx.partySize} ${ctx.partySize === 1 ? 'Person' : 'Personen'}) wurde erfolgreich storniert.
    </p>
    <p style="margin:0;font-size:15px;color:#3d342c;line-height:1.7;">
      Schade, dass es dieses Mal nicht klappt. Wir freuen uns, Sie bald wieder begrüßen zu dürfen.
    </p>
  `;

  const text = `Liebe/r ${ctx.customerName},

Ihre Reservierung am ${fmtDateTime(ctx.startTime)} wurde erfolgreich storniert.

Schade, dass es dieses Mal nicht klappt. Wir freuen uns, Sie bald wieder begrüßen zu dürfen.

${ctx.restaurantName}`;

  return { subject, html: shell(preheader, body, ctx), text };
}
