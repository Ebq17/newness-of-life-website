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

  const apiKey = process.env.CONTACT_RESEND_API_KEY || process.env.RESEND_API_KEY;
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
  const phone = normalizeText(body.phone);
  const message = normalizeText(body.message);
  const subjectInput = normalizeText(body.subject);

  if (!name || !email || !message) {
    return json(400, { error: 'Bitte alle Pflichtfelder ausfuellen.' });
  }
  if (!isValidEmail(email)) {
    return json(400, { error: 'Bitte eine gueltige E-Mail-Adresse angeben.' });
  }

  const ticketId = `CNT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const subject = subjectInput || 'Kontaktanfrage';
  const orgName = process.env.ORG_NAME || 'Newness of Life';
  const churchEmail = process.env.CHURCH_EMAIL || process.env.TO_EMAIL || 'newnessoflife@clgi.org';
  const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.FROM_EMAIL || process.env.RESEND_FROM || 'Newness of Life <kontakt@newnessoflife.de>';
  const noReplyEmail = process.env.CONTACT_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';
  const attachPdf = normalizeBoolean(process.env.CONTACT_ATTACH_PDF || '');

  const attachmentData = attachPdf
    ? [{
        filename: `kontaktanfrage-${ticketId}.pdf`,
        content: buildSimplePdf([
          orgName,
          'Kontaktanfrage',
          '',
          `Ticket: ${ticketId}`,
          `Name: ${name}`,
          `E-Mail: ${email}`,
          phone ? `Telefon: ${phone}` : '',
          `Betreff: ${subject}`,
          '',
          message
        ]).toString('base64')
      }]
    : undefined;

  const resend = new Resend(apiKey);
  const emailStatus = { church_mail: 'skipped', user_confirmation: 'skipped' };
  const emailErrors = {};
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

  try {
    await resend.emails.send({
      from: fromEmail,
      to: churchEmail,
      replyTo: email,
      subject: `Neue Kontaktanfrage (${ticketId}) - ${subject}`,
      html: `
        <h2>Neue Kontaktanfrage ueber die Website</h2>
        <p><strong>Ticket:</strong> ${escapeHtml(ticketId)}</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(phone || '-')}</p>
        <p><strong>Betreff:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Nachricht:</strong><br>${safeMessage}</p>
      `,
      attachments: attachmentData
    });
    emailStatus.church_mail = 'sent';
  } catch (err) {
    emailStatus.church_mail = 'failed';
    emailErrors.church_mail = err.message || String(err);
  }

  try {
    await resend.emails.send({
      from: noReplyEmail,
      to: email,
      replyTo: churchEmail,
      subject: `Vielen Dank fuer deine Nachricht (${ticketId})`,
      html: `
        <p>Hallo ${escapeHtml(name)},</p>
        <p>vielen Dank fuer deine Nachricht an ${escapeHtml(orgName)}.</p>
        <p>Wir haben deine Anfrage erhalten und melden uns so schnell wie moeglich.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticketId)}</p>
        <p>Gottes Segen<br>${escapeHtml(orgName)}</p>
      `,
      attachments: attachmentData
    });
    emailStatus.user_confirmation = 'sent';
  } catch (err) {
    emailStatus.user_confirmation = 'failed';
    emailErrors.user_confirmation = err.message || String(err);
  }

  return json(200, {
    success: true,
    ticketId,
    emailStatus,
    ...(Object.keys(emailErrors).length ? { emailErrors } : {})
  });
};
