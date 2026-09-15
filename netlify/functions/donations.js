'use strict';

const crypto = require('node:crypto');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const ORG_LEGAL_NAME = 'die Kirche des lebendigen Gottes International e.V.';
const ORG_ADDRESS_LINE = 'Hebbelstr. 56–60 · 55127 Mainz';
const ORG_EMAIL = 'newnessoflife@clgi.org';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseAmount(value) {
  const normalized = normalizeText(value).replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDateDE(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapePdfText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

// Branded, single-page receipt: blue header band, a label/value table and a
// closing verse. Kept to PDF's core text/fill operators (no embedded images)
// so the generator has no dependency beyond the built-in Helvetica fonts.
function buildReceiptPdf({ orgName, orgSubtitle, docTitle, rows, verseLines, footerLines }) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 50;
  const headerHeight = 112;
  const clip = (s) => normalizeText(s).replace(/\s+/g, ' ');
  const esc = (s) => escapePdfText(clip(s));

  const ops = [];

  ops.push('0.145 0.388 0.922 rg');
  ops.push(`0 ${pageHeight - headerHeight} ${pageWidth} ${headerHeight} re f`);
  ops.push('1 1 1 rg');
  ops.push(`BT /F2 19 Tf 1 0 0 1 ${marginX} ${pageHeight - 38} Tm (${esc(orgName)}) Tj ET`);
  ops.push(`BT /F1 10 Tf 1 0 0 1 ${marginX} ${pageHeight - 55} Tm (${esc(orgSubtitle)}) Tj ET`);
  ops.push(`BT /F2 15 Tf 1 0 0 1 ${marginX} ${pageHeight - 88} Tm (${esc(docTitle)}) Tj ET`);

  let y = pageHeight - headerHeight - 46;
  const rowHeight = 24;
  for (const [label, value] of rows.slice(0, 12)) {
    ops.push('0.42 0.45 0.5 rg');
    ops.push(`BT /F1 10 Tf 1 0 0 1 ${marginX} ${y} Tm (${esc(label)}) Tj ET`);
    ops.push('0.067 0.094 0.153 rg');
    ops.push(`BT /F2 12 Tf 1 0 0 1 ${marginX + 160} ${y - 1} Tm (${esc(value)}) Tj ET`);
    y -= rowHeight;
  }

  y -= 12;
  ops.push('0.85 0.86 0.88 rg');
  ops.push(`${marginX} ${y} ${pageWidth - marginX * 2} 1 re f`);
  y -= 28;

  if (verseLines && verseLines.length) {
    ops.push('0.30 0.33 0.41 rg');
    for (const line of verseLines) {
      ops.push(`BT /F3 11 Tf 1 0 0 1 ${marginX} ${y} Tm (${esc(line)}) Tj ET`);
      y -= 16;
    }
  }

  let fy = 64;
  ops.push('0.61 0.64 0.69 rg');
  for (const line of (footerLines || [])) {
    ops.push(`BT /F1 9 Tf 1 0 0 1 ${marginX} ${fy} Tm (${esc(line)}) Tj ET`);
    fy -= 12;
  }

  const stream = ops.join('\n');
  const streamLength = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n',
    `7 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const startXref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

// Shared branded HTML shell (logo + org name in a blue header band, the
// caller's body in the middle, address/site in a light footer) used by both
// emails this function sends.
function renderEmailShell({ orgName, siteUrl, bodyHtml }) {
  const cleanSiteUrl = (siteUrl || 'https://newnessoflife.de').replace(/\/$/, '');
  const logoUrl = `${cleanSiteUrl}/images/Logo_Schwarz_Transparent_KS.png`;
  const displayUrl = cleanSiteUrl.replace(/^https?:\/\//, '');
  return `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(17,24,39,0.08);">
            <tr>
              <td style="padding:28px 32px 18px;text-align:center;border-bottom:3px solid #2563EB;">
                <img src="${logoUrl}" width="52" height="52" alt="${escapeHtml(orgName)}" style="display:block;margin:0 auto 10px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:bold;color:#111827;">${escapeHtml(orgName)}</div>
                <div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;color:#6B7280;margin-top:3px;">${escapeHtml(ORG_LEGAL_NAME)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1F2937;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <div style="height:1px;background:#E5E7EB;margin-bottom:20px;"></div>
                <p style="margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.7;">
                  ${escapeHtml(ORG_ADDRESS_LINE)}<br>
                  <a href="${cleanSiteUrl}" style="color:#2563EB;text-decoration:none;">${escapeHtml(displayUrl)}</a>
                  &middot;
                  <a href="mailto:${ORG_EMAIL}" style="color:#2563EB;text-decoration:none;">${ORG_EMAIL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function parseAddress(value, fallbackName) {
  const str = (value || '').toString().trim();
  const match = str.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    return { email: match[2].trim(), name: name || fallbackName };
  }
  return { email: str, name: fallbackName };
}

async function sendBrevoEmail({ apiKey, from, to, replyTo, subject, html, text, attachments }) {
  const payload = {
    sender: parseAddress(from),
    to: [parseAddress(to)],
    subject,
    htmlContent: html,
    ...(text ? { textContent: text } : {}),
    ...(replyTo ? { replyTo: parseAddress(replyTo) } : {}),
    ...(attachments && attachments.length
      ? { attachment: attachments.map((a) => ({ content: a.content, name: a.filename })) }
      : {})
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody && errBody.message ? errBody.message : `Brevo API Error (HTTP ${res.status})`);
  }

  return res.json().catch(() => ({}));
}

function parsePayload(event) {
  const headers = event.headers || {};
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  const bodyRaw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(bodyRaw);
    const out = {};
    for (const [key, value] of params.entries()) out[key] = value;
    return out;
  }

  try {
    return bodyRaw ? JSON.parse(bodyRaw) : {};
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return json(500, { error: 'BREVO_API_KEY is not set' });
  }

  const body = parsePayload(event);
  const honeypot = normalizeText(body.website);
  if (honeypot) {
    return json(200, { success: true });
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email).toLowerCase();
  const amount = parseAmount(body.amount);
  const currency = normalizeText(body.currency || 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR';
  const message = normalizeText(body.message);
  const address = normalizeText(body.address);
  const anonymous = normalizeBoolean(body.anonymous);
  const needsReceipt = normalizeBoolean(body.needsReceipt);
  const rawPaymentMethod = normalizeText(body.paymentMethod).toLowerCase();
  const donationDateInput = normalizeText(body.donationDate);

  if (!email || !isValidEmail(email)) {
    return json(400, { error: 'Bitte eine gueltige E-Mail-Adresse angeben.' });
  }
  if (!amount) {
    return json(400, { error: 'Bitte einen gueltigen Spendenbetrag angeben.' });
  }
  if (!anonymous && !name) {
    return json(400, { error: 'Bitte deinen Namen angeben oder anonym auswaehlen.' });
  }
  if (needsReceipt && (anonymous || !name || !address)) {
    return json(400, { error: 'Fuer eine Spendenquittung werden Name und Adresse benoetigt.' });
  }

  const paymentMethodMap = {
    paypal: 'PayPal',
    bank_transfer: 'Banküberweisung',
    bank: 'Banküberweisung',
    ueberweisung: 'Banküberweisung',
    card: 'Karte',
    cash: 'Bar',
    other: 'Sonstiges'
  };
  const paymentMethodLabel = paymentMethodMap[rawPaymentMethod] || normalizeText(body.paymentMethod) || 'Sonstiges';
  const donationDateValue = donationDateInput && !Number.isNaN(new Date(donationDateInput).getTime())
    ? donationDateInput
    : new Date().toISOString().slice(0, 10);
  const donationDateLabel = formatDateDE(donationDateValue) || donationDateValue;

  const orgName = process.env.ORG_NAME || 'Newness of Life';
  const siteUrl = process.env.SITE_URL || 'https://www.newnessoflife.de';
  const donationTo = process.env.DONATION_TO_EMAIL || process.env.CHURCH_EMAIL || process.env.TO_EMAIL || 'newnessoflife@clgi.org';
  const donationFrom = process.env.DONATION_FROM_EMAIL || process.env.FROM_EMAIL || 'Newness of Life <kontakt@newnessoflife.de>';
  const donationNoReply = process.env.DONATION_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';

  const donationId = `DON-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const donorName = anonymous ? 'Anonym' : name;
  const amountLabel = formatCurrency(amount, currency);

  const pdfBuffer = buildReceiptPdf({
    orgName,
    orgSubtitle: 'die Kirche des lebendigen Gottes International e.V.',
    docTitle: 'Spendenbestaetigung',
    rows: [
      ['Belegnummer', donationId],
      ['Name', donorName],
      ['E-Mail', email],
      ['Betrag', amountLabel],
      ['Datum', donationDateLabel],
      ['Zahlungsmethode', paymentMethodLabel],
      ['Spendenquittung angefragt', needsReceipt ? 'Ja' : 'Nein']
    ],
    verseLines: [
      '"Der HERR segne dich und behuete dich. Der HERR lasse sein Angesicht',
      'leuchten ueber dir und sei dir gnaedig. Der HERR hebe sein Angesicht',
      'ueber dich und gebe dir Frieden." (4. Mose 6,24-26)'
    ],
    footerLines: [
      `${orgName} e.V. - Hebbelstr. 56-60 - 55127 Mainz`,
      siteUrl.replace(/^https?:\/\//, '')
    ]
  });
  const attachments = [{
    filename: `spendenbestaetigung-${donationId}.pdf`,
    content: pdfBuffer.toString('base64')
  }];

  const emailStatus = { donor_confirmation: 'skipped', internal_notification: 'skipped' };
  const emailErrors = {};

  try {
    const donorBodyHtml = `
      <p style="margin:0 0 14px;">Liebe/r ${escapeHtml(donorName)},</p>
      <p style="margin:0 0 14px;">von Herzen Dank für deine Unterstützung von <strong>${escapeHtml(orgName)}</strong>! Wir haben deine Spende erfolgreich erfasst.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:18px 0;background:#F9FAFB;border-radius:10px;">
        <tr><td style="padding:14px 18px 4px;color:#6B7280;width:140px;">Belegnummer</td><td style="padding:14px 18px 4px;font-weight:600;color:#111827;">${escapeHtml(donationId)}</td></tr>
        <tr><td style="padding:4px 18px;color:#6B7280;">Betrag</td><td style="padding:4px 18px;font-weight:600;color:#111827;">${escapeHtml(amountLabel)}</td></tr>
        <tr><td style="padding:4px 18px;color:#6B7280;">Datum</td><td style="padding:4px 18px;color:#111827;">${escapeHtml(donationDateLabel)}</td></tr>
        <tr><td style="padding:4px 18px 14px;color:#6B7280;">Zahlungsmethode</td><td style="padding:4px 18px 14px;color:#111827;">${escapeHtml(paymentMethodLabel)}</td></tr>
      </table>
      <p style="margin:0 0 14px;">Im Anhang findest du eine PDF-Bestätigung für deine Unterlagen.</p>
      <p style="margin:0 0 6px;">Falls du eine offizielle Spendenquittung fürs Finanzamt brauchst, antworte einfach auf diese E-Mail mit deiner vollständigen Adresse &ndash; wir kümmern uns darum.</p>
      <div style="border-left:3px solid #10B981;padding:2px 16px;margin:24px 0 4px;font-style:italic;color:#4B5563;font-size:14px;line-height:1.6;">
        &bdquo;Der HERR segne dich und behüte dich. Der HERR lasse sein Angesicht leuchten über dir und sei dir gnädig. Der HERR hebe sein Angesicht über dich und gebe dir Frieden.&ldquo;<br>
        <span style="font-style:normal;font-size:12px;color:#9CA3AF;">4. Mose 6,24&ndash;26</span>
      </div>
      <p style="margin:22px 0 0;">${escapeHtml(orgName)} 🙏</p>
    `;
    await sendBrevoEmail({
      apiKey,
      from: donationNoReply,
      to: email,
      subject: `Vielen Dank für deine Spende – ${orgName}`,
      html: renderEmailShell({ orgName, siteUrl, bodyHtml: donorBodyHtml }),
      text: `Liebe/r ${donorName},\n\nvielen Dank fuer deine Unterstuetzung von ${orgName}. Wir haben deine Spende erfolgreich erfasst.\n\nBelegnummer: ${donationId}\nBetrag: ${amountLabel}\nDatum: ${donationDateLabel}\nZahlungsmethode: ${paymentMethodLabel}\n\nIm Anhang findest du eine PDF-Bestaetigung. Falls du eine offizielle Spendenquittung fuers Finanzamt brauchst, antworte einfach mit deiner vollstaendigen Adresse.\n\n${orgName}`,
      attachments
    });
    emailStatus.donor_confirmation = 'sent';
  } catch (err) {
    emailStatus.donor_confirmation = 'failed';
    emailErrors.donor_confirmation = err && err.message ? err.message : String(err);
  }

  try {
    const internalBodyHtml = `
      <h2 style="margin:0 0 18px;font-size:17px;color:#111827;">💚 Neue Spende erhalten</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin-bottom:18px;">
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;width:150px;vertical-align:top;">Belegnummer</td><td style="padding:5px 0;font-weight:600;color:#111827;">${escapeHtml(donationId)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Name</td><td style="padding:5px 0;color:#111827;">${escapeHtml(donorName)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">E-Mail</td><td style="padding:5px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563EB;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Betrag</td><td style="padding:5px 0;font-weight:600;color:#111827;">${escapeHtml(amountLabel)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Datum</td><td style="padding:5px 0;color:#111827;">${escapeHtml(donationDateLabel)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Zahlung</td><td style="padding:5px 0;color:#111827;">${escapeHtml(paymentMethodLabel)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Anonym</td><td style="padding:5px 0;color:#111827;">${anonymous ? 'Ja' : 'Nein'}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Quittung angefragt</td><td style="padding:5px 0;color:#111827;">${needsReceipt ? 'Ja' : 'Nein'}</td></tr>
      </table>
      <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#374151;margin-bottom:14px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Adresse</div>
        ${address ? escapeHtml(address).replace(/\r?\n/g, '<br>') : '–'}
      </div>
      <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#374151;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Nachricht</div>
        ${message ? escapeHtml(message).replace(/\r?\n/g, '<br>') : '–'}
      </div>
    `;
    await sendBrevoEmail({
      apiKey,
      from: donationFrom,
      to: donationTo,
      subject: `Neue Spende erhalten (${donationId})`,
      replyTo: email,
      html: renderEmailShell({ orgName, siteUrl, bodyHtml: internalBodyHtml }),
      attachments
    });
    emailStatus.internal_notification = 'sent';
  } catch (err) {
    emailStatus.internal_notification = 'failed';
    emailErrors.internal_notification = err && err.message ? err.message : String(err);
  }

  return json(200, {
    success: true,
    donationId,
    emailStatus,
    ...(Object.keys(emailErrors).length ? { emailErrors } : {})
  });
};
