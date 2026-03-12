'use strict';

const crypto = require('node:crypto');
const { Resend } = require('resend');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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

function buildSimplePdf(lines) {
  const pageWidth = 595;
  const pageHeight = 842;
  const startY = 790;
  const lineHeight = 18;
  const safeLines = lines
    .map((line) => normalizeText(line).replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(0, 40);

  const textOps = safeLines.map((line, index) => {
    const y = startY - (index * lineHeight);
    return `1 0 0 1 50 ${y} Tm (${escapePdfText(line)}) Tj`;
  }).join('\n');

  const stream = `BT\n/F1 12 Tf\n${textOps}\nET`;
  const streamLength = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: 'Mail-Service nicht konfiguriert (RESEND_API_KEY fehlt).',
      code: 'CONFIG_MISSING_RESEND_API_KEY'
    });
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
    bank_transfer: 'Bankueberweisung',
    bank: 'Bankueberweisung',
    ueberweisung: 'Bankueberweisung',
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
  const donationFrom = process.env.DONATION_FROM_EMAIL || process.env.FROM_EMAIL || process.env.RESEND_FROM || 'Newness of Life <kontakt@newnessoflife.de>';
  const donationNoReply = process.env.DONATION_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';

  const donationId = `DON-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const donorName = anonymous ? 'Anonym' : name;
  const amountLabel = formatCurrency(amount, currency);
  const pdfLines = [
    orgName,
    'Spendenbestaetigung',
    '',
    `Belegnummer: ${donationId}`,
    `Name: ${donorName}`,
    `E-Mail: ${email}`,
    `Betrag: ${amountLabel}`,
    `Datum: ${donationDateLabel}`,
    `Zahlungsmethode: ${paymentMethodLabel}`,
    needsReceipt ? 'Spendenquittung angefragt: Ja' : 'Spendenquittung angefragt: Nein',
    '',
    'Vielen Dank fuer deine Unterstuetzung.',
    siteUrl
  ];
  const pdfBuffer = buildSimplePdf(pdfLines);
  const attachments = [{
    filename: `spendenbestaetigung-${donationId}.pdf`,
    content: pdfBuffer.toString('base64')
  }];

  const resend = new Resend(apiKey);
  const emailStatus = { donor_confirmation: 'skipped', internal_notification: 'skipped' };
  const emailErrors = {};

  try {
    await resend.emails.send({
      from: donationNoReply,
      to: email,
      subject: `Vielen Dank fuer deine Spende - ${orgName} (${donationId})`,
      html: `
        <p>Liebe/r ${escapeHtml(donorName)},</p>
        <p>vielen Dank fuer deine Unterstuetzung von ${escapeHtml(orgName)}.</p>
        <p>Wir haben deine Spende erfolgreich erfasst.</p>
        <p><strong>Details deiner Spende:</strong><br>
        Belegnummer: ${escapeHtml(donationId)}<br>
        Betrag: ${escapeHtml(amountLabel)}<br>
        Datum: ${escapeHtml(donationDateLabel)}<br>
        Zahlungsmethode: ${escapeHtml(paymentMethodLabel)}</p>
        <p>Im Anhang findest du eine Bestaetigung als PDF.</p>
        <p>Falls du eine offizielle Spendenquittung fuer das Finanzamt benoetigst, antworte bitte auf diese E-Mail mit deiner vollstaendigen Adresse.</p>
        <p>Vielen Dank fuer deine Unterstuetzung.<br>${escapeHtml(orgName)}</p>
      `,
      attachments
    });
    emailStatus.donor_confirmation = 'sent';
  } catch (err) {
    emailStatus.donor_confirmation = 'failed';
    emailErrors.donor_confirmation = err && err.message ? err.message : String(err);
  }

  try {
    await resend.emails.send({
      from: donationFrom,
      to: donationTo,
      subject: `Neue Spende erhalten (${donationId})`,
      reply_to: email,
      html: `
        <p><strong>Neue Spende erhalten</strong></p>
        <p>Belegnummer: ${escapeHtml(donationId)}<br>
        Name: ${escapeHtml(donorName)}<br>
        E-Mail: ${escapeHtml(email)}<br>
        Betrag: ${escapeHtml(amountLabel)}<br>
        Datum: ${escapeHtml(donationDateLabel)}<br>
        Zahlung: ${escapeHtml(paymentMethodLabel)}<br>
        Anonym: ${anonymous ? 'Ja' : 'Nein'}<br>
        Spendenquittung angefragt: ${needsReceipt ? 'Ja' : 'Nein'}</p>
        <p><strong>Adresse:</strong><br>${address ? escapeHtml(address).replace(/\r?\n/g, '<br>') : '-'}</p>
        <p><strong>Nachricht:</strong><br>${message ? escapeHtml(message).replace(/\r?\n/g, '<br>') : '-'}</p>
      `,
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
