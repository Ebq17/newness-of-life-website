// admin-server.js - API Server für das Admin-Panel
'use strict';

const http = require('http');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const url = require('url');
const { Resend } = require('resend');
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

function renderTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function toHtml(text) {
  return text.replace(/\n/g, '<br>');
}

async function sendEmail({ to, subject, html, replyTo, from }) {
  // In tests / local runs we want to be able to hit /api/contact without network access.
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL === '1') {
    return { ok: true, skipped: true };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set (emails disabled)');
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (error) {
      // NOTE: Logging the full error for more detailed debugging.
      console.error('Resend API Error:', JSON.stringify(error, null, 2));
      throw new Error(`Resend API Error: ${error.name} - ${error.message}`);
    }

    return { ok: true, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    // Re-throw a generic but informative error to the caller.
    throw new Error(`Failed to send email via Resend: ${err.message || 'Unknown error'}`);
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
          const TO_EMAIL = process.env.TO_EMAIL || process.env.INTERNAL_EMAIL || 'newnessoflife@clgi.org';
          const FROM_EMAIL = process.env.FROM_EMAIL || process.env.RESEND_FROM || 'Newness of Life <kontakt@newnessoflife.de>';
          const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL || 'Newness of Life <noreply@newnessoflife.de>';

          const ip = getClientIp(req);
          if (isRateLimited(ip)) {
            jsonResponse(res, { error: 'Zu viele Anfragen. Bitte spaeter erneut versuchen.' }, 429);
            return;
          }

          const body = await parseBody(req);
          const name = normalizeText(body.name);
          const email = normalizeText(body.email);
          const subject = normalizeText(body.subject) || 'Kontaktanfrage';
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

          // --- Email Templating ---
          const templates = {
            Allgemein: {
              subject: 'Wir haben deine Nachricht erhalten (Ticket {{ticketId}})',
              body: `Hallo {{name}},\n\nvielen Dank fuer deine Nachricht an Newness of Life. Wir haben sie erhalten und melden uns in der Regel innerhalb von 24–48 Stunden.\n\nBetreff: {{subject}}\nTicket: {{ticketId}}\n\nWenn du noch Infos ergaenzen moechtest, antworte einfach auf diese E-Mail und nenne die Ticket-Nummer.\n\nHerzliche Gruesse\nNewness of Life (Verein)\nDatenschutz: Deine Daten werden nur zur Bearbeitung deiner Anfrage genutzt.`
            },
            Spende: {
              subject: 'Danke fuer deine Spendenanfrage (Ticket {{ticketId}})',
              body: `Hallo {{name}},\n\ndanke, dass du Newness of Life unterstuetzen moechtest.\nWir haben deine Nachricht erhalten und melden uns in der Regel innerhalb von 24–48 Stunden.\n\nBankdaten (IBAN/BIC) folgen in Kuerze.\nWenn du eine Spendenquittung brauchst, antworte bitte mit deiner vollstaendigen Adresse.\n\nTicket: {{ticketId}}\n\nHerzliche Gruesse\nNewness of Life (Verein)`
            },
            'Event/Anmeldung': {
              subject: 'Event-Anfrage erhalten (Ticket {{ticketId}})',
              body: `Hallo {{name}},\n\ndanke fuer deine Nachricht an Newness of Life. Wir haben deine Event-Anfrage erhalten und melden uns in der Regel innerhalb von 24–48 Stunden.\n\nDamit wir dir schnell helfen koennen, schick uns bitte (falls noch nicht drin):\n- Event-Name & Datum\n- Anzahl Personen\n- Worum geht's genau? (Infos/Anmeldung/Mitarbeit)\n\nTicket: {{ticketId}}\n\nHerzliche Gruesse\nNewness of Life (Verein)`
            },
            'Raum/Technik': {
              subject: 'Anfrage zur Location/Technik erhalten (Ticket {{ticketId}})',
              body: `Hallo {{name}},\n\ndanke fuer deine Nachricht. Wir haben deine Anfrage erhalten und melden uns in der Regel innerhalb von 24–48 Stunden.\n\nDamit wir dir direkt antworten koennen, schick uns bitte (falls noch nicht enthalten):\n- Datum/Uhrzeit\n- Was genau planst du?\n- Brauchst du Starkstrom? (Ja/Nein)\n- Brauchst du WLAN? (Ja/Nein)\n\nTicket: {{ticketId}}\n\nHerzliche Gruesse\nNewness of Life (Verein)`
            },
            'Seelsorge/Gebet': {
              subject: 'Wir haben deine Nachricht erhalten (vertraulich) – Ticket {{ticketId}}',
              body: `Hallo {{name}},\n\ndanke, dass du dich gemeldet hast. Wir behandeln deine Nachricht vertraulich und melden uns in der Regel innerhalb von 24–48 Stunden.\n\nWenn es dringend ist und du sofort Hilfe brauchst, wende dich bitte in akuten Notfaellen an 112.\n\nTicket: {{ticketId}}\n\nHerzliche Gruesse\nNewness of Life (Verein)`
            }
          };

          const template = templates[category] || templates.Allgemein;
          const vars = { ticketId, name, subject };

          // --- Send Emails ---
          const emailStatus = { auto_reply: 'skipped', internal_notification: 'skipped' };
          const emailErrors = {};

          // 1. Auto-Reply to sender
          try {
            const autoSubject = renderTemplate(template.subject, vars);
            const autoBody = renderTemplate(template.body, vars);
            await sendEmail({
              from: NOREPLY_EMAIL,
              to: email,
              subject: autoSubject,
              html: toHtml(autoBody)
            });
            emailStatus.auto_reply = 'sent';
          } catch (err) {
            emailStatus.auto_reply = 'failed';
            emailErrors.auto_reply = err.message || String(err);
            console.error(`Failed to send auto-reply to ${email}:`, err);
          }

          // 2. Internal notification
          try {
            const internalSubject = `Neue Website-Anfrage (${ticketId}) – ${subject}`;
            const internalBody = `Ticket: ${ticketId}\nName: ${name}\nE-Mail: ${email}\nKategorie: ${category}\nZeit: ${createdAt}\n\nNachricht:\n${message}\n\nWichtig: Antwort an ${email} senden.`;
            await sendEmail({
              from: FROM_EMAIL,
              to: TO_EMAIL,
              subject: internalSubject,
              html: toHtml(internalBody),
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
  });
}
