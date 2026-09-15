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

// Branded, single-page summary: blue header band + a label/value table.
// Only used when CONTACT_ATTACH_PDF=1.
function buildReceiptPdf({ orgName, orgSubtitle, docTitle, rows, noteLines, footerLines }) {
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
    ops.push(`BT /F2 12 Tf 1 0 0 1 ${marginX + 120} ${y - 1} Tm (${esc(value)}) Tj ET`);
    y -= rowHeight;
  }

  if (noteLines && noteLines.length) {
    y -= 12;
    ops.push('0.85 0.86 0.88 rg');
    ops.push(`${marginX} ${y} ${pageWidth - marginX * 2} 1 re f`);
    y -= 26;
    ops.push('0.22 0.25 0.32 rg');
    for (const line of noteLines) {
      ops.push(`BT /F1 11 Tf 1 0 0 1 ${marginX} ${y} Tm (${esc(line)}) Tj ET`);
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
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`
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
function renderEmailShell({ orgName, siteUrl, bodyHtml, legalName }) {
  const cleanSiteUrl = (siteUrl || 'https://newnessoflife.de').replace(/\/$/, '');
  const logoUrl = `${cleanSiteUrl}/images/Logo_Schwarz_Transparent_KS.png`;
  const displayUrl = cleanSiteUrl.replace(/^https?:\/\//, '');
  const shellLegalName = legalName || ORG_LEGAL_NAME;
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
                <div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;color:#6B7280;margin-top:3px;">${escapeHtml(shellLegalName)}</div>
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

  const apiKey = process.env.CONTACT_BREVO_API_KEY || process.env.BREVO_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: 'Mail-Service nicht konfiguriert (BREVO_API_KEY fehlt).',
      code: 'CONFIG_MISSING_BREVO_API_KEY'
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
  const lang = normalizeText(body.lang).toLowerCase() === 'en' ? 'en' : 'de';

  if (!name || !email || !message) {
    return json(400, { error: 'Bitte alle Pflichtfelder ausfuellen.' });
  }
  if (!isValidEmail(email)) {
    return json(400, { error: 'Bitte eine gueltige E-Mail-Adresse angeben.' });
  }

  const ticketId = `CNT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const subject = subjectInput || (lang === 'en' ? 'Contact request' : 'Kontaktanfrage');
  const orgName = process.env.ORG_NAME || 'Newness of Life';
  const siteUrl = process.env.SITE_URL || 'https://www.newnessoflife.de';
  const churchEmail = process.env.CHURCH_EMAIL || process.env.TO_EMAIL || 'newnessoflife@clgi.org';
  const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.FROM_EMAIL || 'Newness of Life <kontakt@newnessoflife.de>';
  const noReplyEmail = process.env.CONTACT_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';
  const attachPdf = normalizeBoolean(process.env.CONTACT_ATTACH_PDF || '');

  const attachmentData = attachPdf
    ? [{
        filename: `kontaktanfrage-${ticketId}.pdf`,
        content: buildReceiptPdf({
          orgName,
          orgSubtitle: 'die Kirche des lebendigen Gottes International e.V.',
          docTitle: 'Kontaktanfrage',
          rows: [
            ['Referenz', ticketId],
            ['Name', name],
            ['E-Mail', email],
            ...(phone ? [['Telefon', phone]] : []),
            ['Betreff', subject]
          ],
          noteLines: [message],
          footerLines: [
            `${orgName} e.V. - Hebbelstr. 56-60 - 55127 Mainz`,
            siteUrl.replace(/^https?:\/\//, '')
          ]
        }).toString('base64')
      }]
    : undefined;

  const emailStatus = { internal_notification: 'skipped', auto_reply: 'skipped' };
  const emailErrors = {};
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

  try {
    const internalBodyHtml = `
      <h2 style="margin:0 0 18px;font-size:17px;color:#111827;">📬 Neue Kontaktanfrage</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin-bottom:18px;">
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;width:110px;vertical-align:top;">Name</td><td style="padding:5px 0;font-weight:600;color:#111827;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">E-Mail</td><td style="padding:5px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563EB;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Telefon</td><td style="padding:5px 0;color:#111827;">${escapeHtml(phone || '–')}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Betreff</td><td style="padding:5px 0;color:#111827;">${escapeHtml(subject)}</td></tr>
      </table>
      <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#374151;">${safeMessage}</div>
      <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;">Referenz: ${escapeHtml(ticketId)} &middot; Antworten geht direkt an ${escapeHtml(email)} (Reply-To).</p>
    `;
    await sendBrevoEmail({
      apiKey,
      from: fromEmail,
      to: churchEmail,
      replyTo: email,
      subject: `Neue Kontaktanfrage (${ticketId}) - ${subject}`,
      html: renderEmailShell({ orgName, siteUrl, bodyHtml: internalBodyHtml }),
      attachments: attachmentData
    });
    emailStatus.internal_notification = 'sent';
  } catch (err) {
    emailStatus.internal_notification = 'failed';
    emailErrors.internal_notification = err.message || String(err);
  }

  try {
    const autoReplyBodyHtml = lang === 'en' ? `
      <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 14px;">great to hear from you! Thank you for reaching out to <strong>${escapeHtml(orgName)}</strong> – we've received your message and will get back to you as soon as possible, usually within 1&ndash;2 days.</p>
      <div style="background:#F9FAFB;border-radius:10px;padding:16px 18px;margin:18px 0;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Your message</div>
        <div style="font-size:14px;color:#374151;">${safeMessage}</div>
      </div>
      <p style="margin:18px 0 0;">Talk soon – we look forward to connecting with you!</p>
      <p style="margin:14px 0 0;">Blessings 🕊️<br><strong>${escapeHtml(orgName)}</strong></p>
      <p style="margin:22px 0 0;font-size:11px;color:#D1D5DB;">Reference: ${escapeHtml(ticketId)}</p>
    ` : `
      <p style="margin:0 0 14px;">Hallo ${escapeHtml(name)},</p>
      <p style="margin:0 0 14px;">schön, von dir zu hören! Vielen Dank für deine Nachricht an <strong>${escapeHtml(orgName)}</strong> – wir haben sie erhalten und melden uns so schnell wie möglich bei dir, meistens innerhalb von 1&ndash;2 Tagen.</p>
      <div style="background:#F9FAFB;border-radius:10px;padding:16px 18px;margin:18px 0;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Deine Nachricht</div>
        <div style="font-size:14px;color:#374151;">${safeMessage}</div>
      </div>
      <p style="margin:18px 0 0;">Bis bald – wir freuen uns auf den Austausch mit dir!</p>
      <p style="margin:14px 0 0;">Gottes Segen 🕊️<br><strong>${escapeHtml(orgName)}</strong></p>
      <p style="margin:22px 0 0;font-size:11px;color:#D1D5DB;">Referenz: ${escapeHtml(ticketId)}</p>
    `;
    const autoReplySubject = lang === 'en' ? `Thank you for your message – ${orgName}` : `Vielen Dank für deine Nachricht – ${orgName}`;
    const autoReplyText = lang === 'en'
      ? `Hi ${name},\n\nthank you for reaching out to ${orgName}. We've received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nBlessings\n${orgName}`
      : `Hallo ${name},\n\nvielen Dank fuer deine Nachricht an ${orgName}. Wir haben sie erhalten und melden uns so schnell wie moeglich bei dir.\n\nDeine Nachricht:\n${message}\n\nGottes Segen\n${orgName}`;
    const shellLegalName = lang === 'en' ? 'Church of the Living God International e.V.' : undefined;
    await sendBrevoEmail({
      apiKey,
      from: noReplyEmail,
      to: email,
      replyTo: churchEmail,
      subject: autoReplySubject,
      html: renderEmailShell({ orgName, siteUrl, bodyHtml: autoReplyBodyHtml, legalName: shellLegalName }),
      text: autoReplyText,
      attachments: attachmentData
    });
    emailStatus.auto_reply = 'sent';
  } catch (err) {
    emailStatus.auto_reply = 'failed';
    emailErrors.auto_reply = err.message || String(err);
  }

  return json(200, {
    success: true,
    ticketId,
    emailStatus,
    ...(Object.keys(emailErrors).length ? { emailErrors } : {})
  });
};
