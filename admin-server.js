// admin-server.js - API Server für das Admin-Panel
'use strict';

const http = require('http');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const url = require('url');
const https = require('https');

function loadEnvFile(filePath) {
  try {
    const raw = fsSync.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      let value = match[2] || '';
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\\n/g, '\n');

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      console.warn(`Could not read env file ${filePath}:`, err.message);
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));

// Simple rate limit (per IP)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// JSON Response Helper
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Parse JSON Body
async function parseBody(req, { limitBytes = 1_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseAmount(value) {
  const normalized = normalizeText(value).replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'EUR'}`;
  }
}

function formatDateDE(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja';
  }
  if (typeof value === 'number') return value === 1;
  return false;
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

// Branded, single-page document: blue header band, a label/value table and
// an optional closing verse. Kept to PDF's core text/fill operators (no
// embedded images) so the generator has no dependency beyond Helvetica.
function buildReceiptPdf({ orgName, orgSubtitle, docTitle, rows, noteLines, verseLines, footerLines }) {
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
    ops.push(`BT /F2 12 Tf 1 0 0 1 ${marginX + 150} ${y - 1} Tm (${esc(value)}) Tj ET`);
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

  if (verseLines && verseLines.length) {
    y -= 10;
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

function nextDonationId(lastDonationNumber) {
  const year = new Date().getFullYear();
  const nextNumber = lastDonationNumber + 1;
  return {
    donationId: `DON-${year}-${String(nextNumber).padStart(6, '0')}`,
    nextNumber
  };
}

function classifyCategory(subject, message) {
  const text = `${subject} ${message}`.toLowerCase();
  const rules = [
    { category: 'Spende', keywords: ['spende', 'spenden', 'donation', 'paypal', 'iban', 'quittung', 'spendenquittung', 'bescheinigung'] },
    { category: 'Event/Anmeldung', keywords: ['event', 'veranstaltung', 'anmeldung', 'anmelden', 'ticket', 'registrierung'] },
    { category: 'Raum/Technik', keywords: ['raum', 'location', 'mieten', 'wlan', 'internet', 'starkstrom', 'strom', 'technik', 'ton', 'licht'] },
    { category: 'Seelsorge/Gebet', keywords: ['gebet', 'seelsorge', 'gespräch', 'dringend', 'vertraulich'] }
  ];
  for (const rule of rules) {
    if (rule.keywords.some(k => text.includes(k))) return rule.category;
  }
  return 'Allgemein';
}

function nextTicketId(lastTicketNumber) {
  const year = new Date().getFullYear();
  const nextNumber = lastTicketNumber + 1;
  return {
    ticketId: `NOL-${year}-${String(nextNumber).padStart(6, '0')}`,
    nextNumber
  };
}

const ORG_LEGAL_NAME = 'die Kirche des lebendigen Gottes International e.V.';
const ORG_ADDRESS_LINE = 'Hebbelstr. 56–60 · 55127 Mainz';
const ORG_EMAIL = 'newnessoflife@clgi.org';

// Shared branded HTML shell (logo + org name in a blue header band, the
// caller's body in the middle, address/site in a light footer).
function renderEmailShell({ orgName, siteUrl, bodyHtml, legalName, lang }) {
  const cleanSiteUrl = (siteUrl || 'https://newnessoflife.de').replace(/\/$/, '');
  const logoUrl = `${cleanSiteUrl}/images/Logo_Schwarz_Transparent_KS.png`;
  const displayUrl = cleanSiteUrl.replace(/^https?:\/\//, '');
  const shellLegalName = legalName || ORG_LEGAL_NAME;
  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'de'}">
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

function parseEmailAddress(value, fallbackName) {
  const str = (value || '').toString().trim();
  const match = str.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    return { email: match[2].trim(), name: name || fallbackName };
  }
  return { email: str, name: fallbackName };
}

async function sendEmail({ to, subject, html, replyTo, from, attachments }) {
  // In tests / local runs we want to be able to hit /api/contact without network access.
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL === '1') {
    return { ok: true, skipped: true };
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set (emails disabled)');
  }

  const payload = {
    sender: parseEmailAddress(from),
    to: [parseEmailAddress(to)],
    subject,
    htmlContent: html,
    ...(replyTo ? { replyTo: parseEmailAddress(replyTo) } : {}),
    ...(attachments && attachments.length
      ? { attachment: attachments.map((a) => ({ content: a.content, name: a.filename })) }
      : {}),
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      // NOTE: Logging the full error for more detailed debugging.
      console.error('Brevo API Error:', JSON.stringify(errBody, null, 2));
      throw new Error(`Brevo API Error: ${errBody && errBody.message ? errBody.message : `HTTP ${res.status}`}`);
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    // Re-throw a generic but informative error to the caller.
    throw new Error(`Failed to send email via Brevo: ${err.message || 'Unknown error'}`);
  }
}

// Run Build
function runBuild({ rootDir }) {
  return new Promise((resolve, reject) => {
    exec('node build.js', { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stderr });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}

// Handle multipart file upload
async function handleUpload(req, { imagesDir }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        if (!contentType.includes('multipart/form-data')) {
          throw new Error('Expected multipart/form-data');
        }

        // Extract boundary
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
        if (!boundaryMatch) throw new Error('No boundary found');
        const boundary = boundaryMatch[1] || boundaryMatch[2];

        // Parse multipart data (simplified)
        const parts = buffer.toString('binary').split(`--${boundary}`);

        for (const part of parts) {
          if (part.includes('filename=')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              const filename = filenameMatch[1].replace(/[^a-zA-Z0-9.-]/g, '_');
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd > -1) {
                let fileData = part.slice(headerEnd + 4);
                // Remove trailing boundary markers
                const endIndex = fileData.lastIndexOf('\r\n');
                if (endIndex > -1) {
                  fileData = fileData.slice(0, endIndex);
                }

                await fs.mkdir(imagesDir, { recursive: true });
                let outName = filename;
                let outPath = path.join(imagesDir, outName);
                let counter = 1;
                // Avoid overwriting existing files (professional UX).
                // Example: photo.png -> photo_1.png
                while (true) {
                  try {
                    await fs.access(outPath);
                    const ext = path.extname(filename);
                    const base = path.basename(filename, ext);
                    outName = `${base}_${counter}${ext}`;
                    outPath = path.join(imagesDir, outName);
                    counter += 1;
                  } catch {
                    break;
                  }
                }

                await fs.writeFile(outPath, fileData, 'binary');

                resolve({
                  success: true,
                  filename: outName,
                  url: `/images/${outName}`
                });
                return;
              }
            }
          }
        }

        reject(new Error('No file found in upload'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// MIME Types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Serve Static File
async function serveStaticFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const data = await fs.readFile(filePath);
    res.writeHead(200, { ...corsHeaders, 'Content-Type': contentType });
    res.end(data);
    return true;
  } catch (err) {
    return false;
  }
}

function isSafeJsonFileName(filename) {
  return /^[a-zA-Z0-9_.-]+\.json$/.test(filename);
}

function resolveSafePath(rootDir, decodedPathname) {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, '.' + decodedPathname);
  if (resolved === root) return resolved;
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function createRequestHandler({ rootDir = __dirname } = {}) {
  const ROOT_DIR = rootDir;
  const DATA_DIR = path.join(ROOT_DIR, 'data');
  const PAGES_DATA_DIR = path.join(DATA_DIR, 'pages');
  const IMAGES_DIR = path.join(ROOT_DIR, 'images');
  const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
  const DONATIONS_FILE = path.join(DATA_DIR, 'donations.json');

  async function loadJson(filename) {
    if (!isSafeJsonFileName(filename)) {
      throw new Error('Invalid filename');
    }
    const filePath = path.join(DATA_DIR, filename);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      // Try in pages subdirectory
      const pagesPath = path.join(PAGES_DATA_DIR, filename);
      try {
        const data = await fs.readFile(pagesPath, 'utf8');
        return JSON.parse(data);
      } catch {
        throw new Error(`File not found: ${filename}`);
      }
    }
  }

  async function saveJson(filename, data) {
    if (!isSafeJsonFileName(filename)) {
      throw new Error('Invalid filename');
    }

    let filePath = path.join(DATA_DIR, filename);

    // Page-specific files live in data/pages
    const pageFiles = new Set(['ueber-uns.json', 'gottesdienste.json', 'spenden.json', 'datenschutz.json', 'impressum.json']);
    if (pageFiles.has(filename)) {
      filePath = path.join(PAGES_DATA_DIR, filename);
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  }

  async function loadContacts() {
    try {
      const raw = await fs.readFile(CONTACTS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { lastTicketNumber: 0, items: [] };
    }
  }

  async function saveContacts(data) {
    await fs.mkdir(path.dirname(CONTACTS_FILE), { recursive: true });
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  async function loadDonations() {
    try {
      const raw = await fs.readFile(DONATIONS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { lastDonationNumber: 0, items: [] };
    }
  }

  async function saveDonations(data) {
    await fs.mkdir(path.dirname(DONATIONS_FILE), { recursive: true });
    await fs.writeFile(DONATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  async function listImages() {
    try {
      const results = [];
      const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);

      async function walk(dir, relPosix) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const abs = path.join(dir, entry.name);
          const rel = relPosix ? `${relPosix}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            await walk(abs, rel);
            continue;
          }
          if (!isImage(entry.name)) continue;

          results.push({
            name: entry.name,
            url: `/images/${rel}`
          });
        }
      }

      await walk(IMAGES_DIR, '');
      return results.sort((a, b) => a.url.localeCompare(b.url));
    } catch {
      return [];
    }
  }

  function resolveImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    let clean = imageUrl.trim();
    if (/^https?:\/\//i.test(clean)) {
      try {
        clean = new URL(clean).pathname || '';
      } catch {
        return null;
      }
    }
    clean = decodeURIComponent(clean.split('?')[0].split('#')[0]).trim();
    if (!clean.startsWith('/images/')) return null;

    const rel = clean.replace(/^\/images\//, '');
    if (!rel) return null;

    const normalized = path.posix.normalize(rel);
    if (!normalized || normalized.startsWith('../') || normalized.includes('/../')) return null;

    const root = path.resolve(IMAGES_DIR);
    const absolute = path.resolve(root, normalized);
    if (absolute === root || !absolute.startsWith(root + path.sep)) return null;

    return {
      url: `/images/${normalized}`,
      path: absolute
    };
  }

  async function deleteImage(imageUrl) {
    const resolved = resolveImageUrl(imageUrl);
    if (!resolved) {
      const err = new Error('Invalid image URL');
      err.code = 'INVALID_IMAGE_URL';
      throw err;
    }

    try {
      const stat = await fs.stat(resolved.path);
      if (!stat.isFile()) {
        const err = new Error('Image not found');
        err.code = 'IMAGE_NOT_FOUND';
        throw err;
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        const notFound = new Error('Image not found');
        notFound.code = 'IMAGE_NOT_FOUND';
        throw notFound;
      }
      throw err;
    }

    await fs.unlink(resolved.path);

    return {
      success: true,
      deleted: resolved.url
    };
  }

  async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    try {
      // API Routes
      if (pathname.startsWith('/api/')) {
        const route = pathname.replace('/api/', '');

        if ((method === 'GET' || method === 'PUT') && route.startsWith('data/')) {
          const filename = route.replace('data/', '');
          if (!isSafeJsonFileName(filename)) {
            jsonResponse(res, { error: 'Invalid filename' }, 400);
            return;
          }
          if (method === 'GET') {
            const data = await loadJson(filename);
            jsonResponse(res, data);
            return;
          }
          const body = await parseBody(req);
          const result = await saveJson(filename, body);
          jsonResponse(res, result);
          return;
        }

        // POST /api/build - Run build
        if (method === 'POST' && route === 'build') {
          const result = await runBuild({ rootDir: ROOT_DIR });
          jsonResponse(res, result);
          return;
        }

        // GET /api/images - List images
        if (method === 'GET' && route === 'images') {
          const images = await listImages();
          jsonResponse(res, images);
          return;
        }

        // DELETE /api/images - Delete image
        if (method === 'DELETE' && route === 'images') {
          let body = {};
          try {
            body = await parseBody(req);
          } catch (err) {
            body = {};
          }

          const imageUrl = normalizeText(body.url || parsedUrl.query.url);
          if (!imageUrl) {
            jsonResponse(res, { error: 'Image URL is required' }, 400);
            return;
          }

          try {
            const result = await deleteImage(imageUrl);
            jsonResponse(res, result);
          } catch (err) {
            if (err.code === 'INVALID_IMAGE_URL') {
              jsonResponse(res, { error: err.message }, 400);
              return;
            }
            if (err.code === 'IMAGE_NOT_FOUND') {
              jsonResponse(res, { error: err.message }, 404);
              return;
            }
            throw err;
          }
          return;
        }

        // POST /api/upload - Upload image
        if (method === 'POST' && route === 'upload') {
          const result = await handleUpload(req, { imagesDir: IMAGES_DIR });
          jsonResponse(res, result);
          return;
        }

        // GET /api/status - Server status
        if (method === 'GET' && route === 'status') {
          jsonResponse(res, { status: 'ok', time: new Date().toISOString() });
          return;
        }

        // POST /api/contact - Contact form handler
        if (method === 'POST' && route === 'contact') {
          const TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.CHURCH_EMAIL || process.env.TO_EMAIL || process.env.INTERNAL_EMAIL || 'newnessoflife@clgi.org';
          const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || process.env.FROM_EMAIL || 'Newness of Life <kontakt@newnessoflife.de>';
          const NOREPLY_EMAIL = process.env.CONTACT_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';

          const ip = getClientIp(req);
          if (isRateLimited(ip)) {
            jsonResponse(res, { error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' }, 429);
            return;
          }

          const body = await parseBody(req);
          const name = normalizeText(body.name);
          const email = normalizeText(body.email);
          const lang = normalizeText(body.lang).toLowerCase() === 'en' ? 'en' : 'de';
          const subject = normalizeText(body.subject) || (lang === 'en' ? 'Contact request' : 'Kontaktanfrage');
          const message = normalizeText(body.message);
          const website = normalizeText(body.website);

          // Honeypot
          if (website) {
            jsonResponse(res, { success: true }); // Silently succeed
            return;
          }

          if (!name || !email || !message) {
            jsonResponse(res, { error: 'Bitte alle Pflichtfelder ausfuellen.' }, 400);
            return;
          }

          // --- Save contact to local file (optional, can be disabled) ---
          const contacts = await loadContacts();
          const { ticketId, nextNumber } = nextTicketId(contacts.lastTicketNumber || 0);
          contacts.lastTicketNumber = nextNumber;

          const category = classifyCategory(subject, message);
          const createdAt = new Date().toISOString();

          const record = { ticketId, name, email, subject, message, category, createdAt, ip };
          contacts.items.push(record);
          await saveContacts(contacts);
          // --- End of saving logic ---

          // --- Email content per category ---
          const orgName = process.env.ORG_NAME || 'Newness of Life';
          const siteUrl = process.env.SITE_URL || 'https://www.newnessoflife.de';
          const infoBox = (html) => `<div style="background:#F9FAFB;border-radius:10px;padding:14px 18px;margin-top:14px;font-size:14px;color:#374151;line-height:1.6;">${html}</div>`;
          const categoryContent = {
            de: {
              Allgemein: {
                subject: 'Wir haben deine Nachricht erhalten',
                intro: `vielen Dank für deine Nachricht an <strong>${escapeHtml(orgName)}</strong>! Wir haben sie erhalten und melden uns in der Regel innerhalb von 24&ndash;48 Stunden bei dir.`,
                extraHtml: ''
              },
              Spende: {
                subject: 'Danke für deine Spendenanfrage',
                intro: `danke, dass du <strong>${escapeHtml(orgName)}</strong> unterstützen möchtest! Wir haben deine Nachricht erhalten und melden uns in der Regel innerhalb von 24&ndash;48 Stunden bei dir.`,
                extraHtml: infoBox('Unsere Bankdaten (IBAN/BIC) schicken wir dir in Kürze. Falls du eine Spendenquittung fürs Finanzamt brauchst, antworte einfach mit deiner vollständigen Adresse.')
              },
              'Event/Anmeldung': {
                subject: 'Deine Event-Anfrage ist bei uns angekommen',
                intro: `danke für deine Nachricht an <strong>${escapeHtml(orgName)}</strong>! Wir haben deine Event-Anfrage erhalten und melden uns in der Regel innerhalb von 24&ndash;48 Stunden bei dir.`,
                extraHtml: infoBox('<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:8px;">Damit wir dir schnell helfen können, sag uns gern noch</div>&bull; Event-Name &amp; Datum<br>&bull; Anzahl Personen<br>&bull; Worum geht’s genau? (Infos / Anmeldung / Mitarbeit)')
              },
              'Raum/Technik': {
                subject: 'Deine Anfrage zu Location & Technik ist da',
                intro: `danke für deine Nachricht! Wir haben deine Anfrage erhalten und melden uns in der Regel innerhalb von 24&ndash;48 Stunden bei dir.`,
                extraHtml: infoBox('<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:8px;">Damit wir dir direkt antworten können, sag uns gern noch</div>&bull; Datum / Uhrzeit<br>&bull; Was genau planst du?<br>&bull; Brauchst du Starkstrom?<br>&bull; Brauchst du WLAN?')
              },
              'Seelsorge/Gebet': {
                subject: 'Wir haben deine Nachricht erhalten (vertraulich)',
                intro: 'danke, dass du dich gemeldet hast. Wir behandeln deine Nachricht vertraulich und melden uns in der Regel innerhalb von 24&ndash;48 Stunden bei dir.',
                extraHtml: `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin-top:14px;font-size:13px;color:#92400E;">Wenn es dringend ist und du sofort Hilfe brauchst, wende dich bitte in akuten Notfällen an <strong>112</strong>.</div>`
              }
            },
            en: {
              Allgemein: {
                subject: 'We’ve received your message',
                intro: `thank you for reaching out to <strong>${escapeHtml(orgName)}</strong>! We've received it and will usually get back to you within 24&ndash;48 hours.`,
                extraHtml: ''
              },
              Spende: {
                subject: 'Thanks for your donation inquiry',
                intro: `thank you for wanting to support <strong>${escapeHtml(orgName)}</strong>! We've received your message and will usually get back to you within 24&ndash;48 hours.`,
                extraHtml: infoBox('We’ll send our bank details (IBAN/BIC) shortly. If you need an official donation receipt for tax purposes, just reply with your full address.')
              },
              'Event/Anmeldung': {
                subject: 'Your event inquiry has reached us',
                intro: `thank you for reaching out to <strong>${escapeHtml(orgName)}</strong>! We've received your event inquiry and will usually get back to you within 24&ndash;48 hours.`,
                extraHtml: infoBox('<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:8px;">So we can help you quickly, feel free to also share</div>&bull; Event name &amp; date<br>&bull; Number of people<br>&bull; What’s it about? (info / registration / volunteering)')
              },
              'Raum/Technik': {
                subject: 'Your room & tech inquiry has arrived',
                intro: `thank you for your message! We've received your inquiry and will usually get back to you within 24&ndash;48 hours.`,
                extraHtml: infoBox('<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:8px;">So we can reply directly, feel free to also share</div>&bull; Date / time<br>&bull; What exactly are you planning?<br>&bull; Do you need high-power electricity?<br>&bull; Do you need WiFi?')
              },
              'Seelsorge/Gebet': {
                subject: 'We’ve received your message (confidential)',
                intro: 'thank you for reaching out. We treat your message confidentially and will usually get back to you within 24&ndash;48 hours.',
                extraHtml: `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin-top:14px;font-size:13px;color:#92400E;">If this is urgent and you need immediate help, please contact emergency services at <strong>112</strong>.</div>`
              }
            }
          };

          const content = categoryContent[lang][category] || categoryContent[lang].Allgemein;
          const safeMessageHtml = escapeHtml(message).replace(/\r?\n/g, '<br>');

          // --- Send Emails ---
          const emailStatus = { auto_reply: 'skipped', internal_notification: 'skipped' };
          const emailErrors = {};

          // 1. Auto-Reply to sender
          try {
            const autoReplyBodyHtml = lang === 'en' ? `
              <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 14px;">${content.intro}</p>
              <div style="background:#F9FAFB;border-radius:10px;padding:16px 18px;margin:18px 0;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Your message</div>
                <div style="font-size:14px;color:#374151;">${safeMessageHtml}</div>
              </div>
              ${content.extraHtml}
              <p style="margin:18px 0 0;">Talk soon &ndash; we look forward to connecting with you!</p>
              <p style="margin:14px 0 0;">Blessings 🕊️<br><strong>${escapeHtml(orgName)}</strong></p>
              <p style="margin:22px 0 0;font-size:11px;color:#D1D5DB;">Reference: ${escapeHtml(ticketId)}</p>
            ` : `
              <p style="margin:0 0 14px;">Hallo ${escapeHtml(name)},</p>
              <p style="margin:0 0 14px;">${content.intro}</p>
              <div style="background:#F9FAFB;border-radius:10px;padding:16px 18px;margin:18px 0;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Deine Nachricht</div>
                <div style="font-size:14px;color:#374151;">${safeMessageHtml}</div>
              </div>
              ${content.extraHtml}
              <p style="margin:18px 0 0;">Bis bald &ndash; wir freuen uns auf den Austausch mit dir!</p>
              <p style="margin:14px 0 0;">Gottes Segen 🕊️<br><strong>${escapeHtml(orgName)}</strong></p>
              <p style="margin:22px 0 0;font-size:11px;color:#D1D5DB;">Referenz: ${escapeHtml(ticketId)}</p>
            `;
            await sendEmail({
              from: NOREPLY_EMAIL,
              to: email,
              subject: `${content.subject} – ${orgName}`,
              html: renderEmailShell({ orgName, siteUrl, bodyHtml: autoReplyBodyHtml, legalName: lang === 'en' ? 'Church of the Living God International e.V.' : undefined, lang })
            });
            emailStatus.auto_reply = 'sent';
          } catch (err) {
            emailStatus.auto_reply = 'failed';
            emailErrors.auto_reply = err.message || String(err);
            console.error(`Failed to send auto-reply to ${email}:`, err);
          }

          // 2. Internal notification
          try {
            const internalBodyHtml = `
              <h2 style="margin:0 0 18px;font-size:17px;color:#111827;">📬 Neue Kontaktanfrage</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin-bottom:18px;">
                <tr><td style="padding:5px 12px 5px 0;color:#6B7280;width:110px;vertical-align:top;">Name</td><td style="padding:5px 0;font-weight:600;color:#111827;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">E-Mail</td><td style="padding:5px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563EB;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Kategorie</td><td style="padding:5px 0;color:#111827;">${escapeHtml(category)}</td></tr>
                <tr><td style="padding:5px 12px 5px 0;color:#6B7280;vertical-align:top;">Betreff</td><td style="padding:5px 0;color:#111827;">${escapeHtml(subject)}</td></tr>
              </table>
              <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#374151;">${safeMessageHtml}</div>
              <p style="margin:18px 0 0;font-size:12px;color:#9CA3AF;">Referenz: ${escapeHtml(ticketId)} &middot; Antworten geht direkt an ${escapeHtml(email)} (Reply-To).</p>
            `;
            await sendEmail({
              from: FROM_EMAIL,
              to: TO_EMAIL,
              subject: `Neue Website-Anfrage (${ticketId}) – ${subject}`,
              html: renderEmailShell({ orgName, siteUrl, bodyHtml: internalBodyHtml }),
              replyTo: email
            });
            emailStatus.internal_notification = 'sent';
          } catch (err) {
            emailStatus.internal_notification = 'failed';
            emailErrors.internal_notification = err.message || String(err);
            console.error(`Failed to send internal notification for ticket ${ticketId}:`, err);
          }

          jsonResponse(res, { success: true, ticketId, category, emailStatus, ...(Object.keys(emailErrors).length ? { emailErrors } : {}) });
          return;
        }

        // POST /api/donations - Donation confirmation request
        if (method === 'POST' && route === 'donations') {
          const TO_EMAIL = process.env.DONATION_TO_EMAIL || process.env.CHURCH_EMAIL || process.env.TO_EMAIL || process.env.INTERNAL_EMAIL || 'newnessoflife@clgi.org';
          const FROM_EMAIL = process.env.DONATION_FROM_EMAIL || process.env.FROM_EMAIL || 'Newness of Life <kontakt@newnessoflife.de>';
          const NOREPLY_EMAIL = process.env.DONATION_NOREPLY_EMAIL || process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';
          const ORG_NAME = process.env.ORG_NAME || 'Newness of Life';
          const SITE_URL = process.env.SITE_URL || 'https://www.newnessoflife.de';

          const ip = getClientIp(req);
          if (isRateLimited(ip)) {
            jsonResponse(res, { error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' }, 429);
            return;
          }

          const body = await parseBody(req);
          const honeypot = normalizeText(body.website);
          if (honeypot) {
            jsonResponse(res, { success: true });
            return;
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
          const lang = normalizeText(body.lang).toLowerCase() === 'en' ? 'en' : 'de';

          if (!email || !isValidEmail(email)) {
            jsonResponse(res, { error: 'Bitte eine gueltige E-Mail-Adresse angeben.' }, 400);
            return;
          }

          if (!amount) {
            jsonResponse(res, { error: 'Bitte einen gueltigen Spendenbetrag angeben.' }, 400);
            return;
          }

          if (!anonymous && !name) {
            jsonResponse(res, { error: 'Bitte deinen Namen angeben oder anonym auswaehlen.' }, 400);
            return;
          }

          if (needsReceipt && (anonymous || !name || !address)) {
            jsonResponse(res, { error: 'Fuer eine Spendenquittung werden Name und Adresse benoetigt.' }, 400);
            return;
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
          const paymentMethodMapEn = {
            paypal: 'PayPal',
            bank_transfer: 'Bank transfer',
            bank: 'Bank transfer',
            ueberweisung: 'Bank transfer',
            card: 'Card',
            cash: 'Cash',
            other: 'Other'
          };
          const paymentMethod = rawPaymentMethod || 'other';
          const paymentMethodLabel = paymentMethodMap[paymentMethod] || normalizeText(body.paymentMethod) || 'Sonstiges';
          const paymentMethodLabelLocalized = lang === 'en'
            ? (paymentMethodMapEn[paymentMethod] || normalizeText(body.paymentMethod) || paymentMethodMapEn.other)
            : paymentMethodLabel;
          const donationDateValue = donationDateInput && !Number.isNaN(new Date(donationDateInput).getTime())
            ? donationDateInput
            : new Date().toISOString().slice(0, 10);

          const donations = await loadDonations();
          const { donationId, nextNumber } = nextDonationId(donations.lastDonationNumber || 0);
          donations.lastDonationNumber = nextNumber;

          const donorName = anonymous ? (lang === 'en' ? 'Anonymous' : 'Anonym') : name;
          const createdAt = new Date().toISOString();
          const record = {
            donationId,
            name: donorName,
            email,
            amount,
            currency,
            paymentMethod,
            paymentMethodLabel,
            donationDate: donationDateValue,
            message,
            address,
            anonymous,
            needsReceipt,
            createdAt,
            ip
          };
          donations.items.push(record);
          await saveDonations(donations);

          const amountLabel = formatCurrency(amount, currency);
          const donationDateLabel = formatDateDE(donationDateValue) || donationDateValue;
          const donationDateLabelLocalized = lang === 'en'
            ? (new Date(donationDateValue).toLocaleDateString('en-GB') || donationDateValue)
            : donationDateLabel;
          const legalNameEn = 'Church of the Living God International e.V.';

          const pdfBuffer = lang === 'en' ? buildReceiptPdf({
            orgName: ORG_NAME,
            orgSubtitle: legalNameEn,
            docTitle: 'Donation Receipt',
            rows: [
              ['Receipt No.', donationId],
              ['Name', donorName],
              ['E-Mail', email],
              ['Amount', amountLabel],
              ['Date', donationDateLabelLocalized],
              ['Payment method', paymentMethodLabelLocalized],
              ['Receipt requested', needsReceipt ? 'Yes' : 'No']
            ],
            verseLines: [
              '"The LORD bless you and keep you; the LORD make his face shine on',
              'you and be gracious to you; the LORD turn his face toward you',
              'and give you peace." (Numbers 6:24-26)'
            ],
            footerLines: [
              `${ORG_NAME} e.V. - Hebbelstr. 56-60 - 55127 Mainz, Germany`,
              SITE_URL.replace(/^https?:\/\//, '')
            ]
          }) : buildReceiptPdf({
            orgName: ORG_NAME,
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
              `${ORG_NAME} e.V. - Hebbelstr. 56-60 - 55127 Mainz`,
              SITE_URL.replace(/^https?:\/\//, '')
            ]
          });
          const attachments = [{
            filename: `spendenbestaetigung-${donationId}.pdf`,
            content: pdfBuffer.toString('base64')
          }];

          const safeMessageHtml = message ? escapeHtml(message).replace(/\r?\n/g, '<br>') : '–';
          const safeAddressHtml = address ? escapeHtml(address).replace(/\r?\n/g, '<br>') : '–';

          const emailStatus = { donor_confirmation: 'skipped', internal_notification: 'skipped' };
          const emailErrors = {};

          try {
            const donorBodyHtml = lang === 'en' ? `
              <p style="margin:0 0 14px;">Dear ${escapeHtml(donorName)},</p>
              <p style="margin:0 0 14px;">thank you so much for supporting <strong>${escapeHtml(ORG_NAME)}</strong>! We've successfully recorded your donation.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:18px 0;background:#F9FAFB;border-radius:10px;">
                <tr><td style="padding:14px 18px 4px;color:#6B7280;width:140px;">Receipt No.</td><td style="padding:14px 18px 4px;font-weight:600;color:#111827;">${escapeHtml(donationId)}</td></tr>
                <tr><td style="padding:4px 18px;color:#6B7280;">Amount</td><td style="padding:4px 18px;font-weight:600;color:#111827;">${escapeHtml(amountLabel)}</td></tr>
                <tr><td style="padding:4px 18px;color:#6B7280;">Date</td><td style="padding:4px 18px;color:#111827;">${escapeHtml(donationDateLabelLocalized)}</td></tr>
                <tr><td style="padding:4px 18px 14px;color:#6B7280;">Payment method</td><td style="padding:4px 18px 14px;color:#111827;">${escapeHtml(paymentMethodLabelLocalized)}</td></tr>
              </table>
              <p style="margin:0 0 14px;">You'll find a PDF confirmation attached for your records.</p>
              <p style="margin:0 0 6px;">If you need an official donation receipt for tax purposes, just reply to this email with your full address &ndash; we'll take care of it.</p>
              <div style="border-left:3px solid #10B981;padding:2px 16px;margin:24px 0 4px;font-style:italic;color:#4B5563;font-size:14px;line-height:1.6;">
                &bdquo;The LORD bless you and keep you; the LORD make his face shine on you and be gracious to you; the LORD turn his face toward you and give you peace.&ldquo;<br>
                <span style="font-style:normal;font-size:12px;color:#9CA3AF;">Numbers 6:24&ndash;26</span>
              </div>
              <p style="margin:22px 0 0;">${escapeHtml(ORG_NAME)} 🙏</p>
            ` : `
              <p style="margin:0 0 14px;">Liebe/r ${escapeHtml(donorName)},</p>
              <p style="margin:0 0 14px;">von Herzen Dank für deine Unterstützung von <strong>${escapeHtml(ORG_NAME)}</strong>! Wir haben deine Spende erfolgreich erfasst.</p>
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
              <p style="margin:22px 0 0;">${escapeHtml(ORG_NAME)} 🙏</p>
            `;
            const donorSubject = lang === 'en' ? `Thank you for your donation – ${ORG_NAME}` : `Vielen Dank für deine Spende – ${ORG_NAME}`;
            await sendEmail({
              from: NOREPLY_EMAIL,
              to: email,
              subject: donorSubject,
              html: renderEmailShell({ orgName: ORG_NAME, siteUrl: SITE_URL, bodyHtml: donorBodyHtml, legalName: lang === 'en' ? legalNameEn : undefined, lang }),
              attachments
            });
            emailStatus.donor_confirmation = 'sent';
          } catch (err) {
            emailStatus.donor_confirmation = 'failed';
            emailErrors.donor_confirmation = err.message || String(err);
            console.error(`Failed to send donor confirmation for ${donationId}:`, err);
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
                ${safeAddressHtml}
              </div>
              <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#374151;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9CA3AF;margin-bottom:6px;">Nachricht</div>
                ${safeMessageHtml}
              </div>
            `;
            await sendEmail({
              from: FROM_EMAIL,
              to: TO_EMAIL,
              subject: `Neue Spende erhalten (${donationId})`,
              html: renderEmailShell({ orgName: ORG_NAME, siteUrl: SITE_URL, bodyHtml: internalBodyHtml }),
              replyTo: email,
              attachments
            });
            emailStatus.internal_notification = 'sent';
          } catch (err) {
            emailStatus.internal_notification = 'failed';
            emailErrors.internal_notification = err.message || String(err);
            console.error(`Failed to send internal donation mail for ${donationId}:`, err);
          }

          jsonResponse(res, { success: true, donationId, emailStatus, ...(Object.keys(emailErrors).length ? { emailErrors } : {}) });
          return;
        }

        jsonResponse(res, { error: 'Not found' }, 404);
        return;
      }

      // Serve static files
      const decodedPathname = decodeURIComponent(pathname);
      let effectivePathname = decodedPathname;
      if (pathname === '/') {
        effectivePathname = '/index.html';
      } else if (pathname === '/admin' || pathname === '/admin/') {
        effectivePathname = '/admin/index.html';
      }

      const filePath = resolveSafePath(ROOT_DIR, effectivePathname);
      if (!filePath) {
        res.writeHead(403, { ...corsHeaders, 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      // Try to serve the file
      const served = await serveStaticFile(res, filePath);
      if (served) return;

      // Try adding .html extension
      if (!path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        const servedHtml = await serveStaticFile(res, htmlPath);
        if (servedHtml) return;
      }

      // 404 for unknown routes
      res.writeHead(404, { ...corsHeaders, 'Content-Type': 'text/html' });
      res.end('<html><body><h1>404 - Seite nicht gefunden</h1><p><a href="/admin/">Zum Admin Dashboard</a></p></body></html>');
    } catch (err) {
      console.error('Error:', err);
      const message = err && err.message ? err.message : 'Server error';
      const status =
        message === 'Payload too large' ? 413 :
        err instanceof SyntaxError ? 400 :
        500;
      jsonResponse(res, { error: message }, status);
    }
  }

  return handleRequest;
}

function createServer(opts) {
  return http.createServer(createRequestHandler(opts));
}

module.exports = { createServer, createRequestHandler };

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3001;
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`\n🚀 Admin API Server running at http://localhost:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /api/data/:file  - Load JSON file`);
    console.log(`  PUT  /api/data/:file  - Save JSON file`);
    console.log(`  POST /api/build       - Run build script`);
    console.log(`  GET  /api/images      - List images`);
    console.log(`  DELETE /api/images    - Delete image`);
    console.log(`  POST /api/upload      - Upload image\n`);
    console.log(`  POST /api/contact     - Contact form\n`);
    console.log(`  POST /api/donations   - Donation confirmation form\n`);
  });
}
