'use strict';

/*
 * Admin-API für newnessoflife.de/admin
 *
 * Login:   E-Mail eingeben -> Link per Mail (Brevo) -> Sitzung (14 Tage)
 * Inhalte: werden aus dem GitHub-Repository gelesen und dorthin gespeichert.
 *          Jeder Speichervorgang ist ein Commit; Netlify baut die Seite danach neu.
 *
 * Benötigte Umgebungsvariablen in Netlify:
 *   GITHUB_TOKEN   Fine-grained Token mit "Contents: Read and write" für das Repo
 *   BREVO_API_KEY  (schon vorhanden, wird auch vom Kontaktformular genutzt)
 * Optional:
 *   ADMIN_EMAILS   Komma-getrennte Liste erlaubter Adressen
 *   ADMIN_SECRET   eigener Signatur-Schlüssel (sonst aus GITHUB_TOKEN abgeleitet)
 *   GITHUB_REPO    Standard: Ebq17/newness-of-life-website
 *   GITHUB_BRANCH  Standard: main
 */

const crypto = require('node:crypto');

const DEFAULT_ADMINS = ['newnessoflife@clgi.org', 'emma_quainoo@yahoo.de'];
const LINK_TTL = 20 * 60;              // 20 Minuten
const SESSION_TTL = 14 * 24 * 60 * 60; // 14 Tage
const SITE_URL = (process.env.SITE_URL || 'https://newnessoflife.de').replace(/\/$/, '');

const CONTENT_FILES = [
  'data/settings.json',
  'data/global.json',
  'data/homepage.json',
  'data/events.json',
  'data/pages/gottesdienste.json',
  'data/pages/ueber-uns.json',
  'data/pages/veranstaltungen.json',
  'data/pages/spenden.json',
  'data/pages/impressum.json',
  'data/pages/datenschutz.json'
];
const IMAGE_DIRS = ['images', 'images/uploads'];
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg)$/i;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// ---------------------------------------------------------------------------

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function allowedEmails() {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length ? list : DEFAULT_ADMINS;
}

function secretKey() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  if (!process.env.GITHUB_TOKEN) return null;
  return crypto.createHash('sha256').update('nol-admin|' + process.env.GITHUB_TOKEN).digest('hex');
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secretKey()).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token, type) {
  const key = secretKey();
  if (!key || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', key).update(body).digest());
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(fromB64url(body).toString('utf8')); } catch { return null; }
  if (payload.typ !== type || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!allowedEmails().includes(String(payload.email || '').toLowerCase())) return null;
  return payload;
}

function sessionFrom(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  return verify(auth.replace(/^Bearer\s+/i, ''), 'session');
}

function parseAddress(value, fallbackName) {
  const s = String(value || '').trim();
  const m = s.match(/^(.*)<([^>]+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || fallbackName, email: m[2].trim() };
  return { name: fallbackName, email: s };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

function repo() { return process.env.GITHUB_REPO || 'Ebq17/newness-of-life-website'; }
function branch() { return process.env.GITHUB_BRANCH || 'main'; }

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'newnessoflife-admin',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}: ${data.message || 'Fehler'}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function readFile(path) {
  const data = await gh(`/contents/${encodeURI(path)}?ref=${branch()}`);
  return Buffer.from(data.content || '', 'base64').toString('utf8');
}

async function listImages() {
  const out = [];
  for (const dir of IMAGE_DIRS) {
    try {
      const items = await gh(`/contents/${dir}?ref=${branch()}`);
      for (const it of items) {
        if (it.type === 'file' && IMAGE_EXT.test(it.name) && it.size > 0) out.push({ path: '/' + it.path, size: it.size });
      }
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  return out;
}

// Mehrere Dateien in einem Commit speichern (Git Data API)
async function commitFiles(files, message) {
  const ref = await gh(`/git/ref/heads/${branch()}`);
  const parentSha = ref.object.sha;
  const parent = await gh(`/git/commits/${parentSha}`);
  const tree = [];
  for (const f of files) {
    const blob = await gh('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: f.base64, encoding: 'base64' })
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] })
  });
  await gh(`/git/refs/heads/${branch()}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  return commit.sha;
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

async function requestLink(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const generic = { ok: true, message: 'Wenn diese Adresse freigeschaltet ist, kommt in wenigen Minuten eine E-Mail mit dem Anmelde-Link.' };
  if (!allowedEmails().includes(email)) return json(200, generic);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !secretKey()) {
    return json(500, { error: 'Der Admin ist noch nicht fertig eingerichtet (BREVO_API_KEY oder GITHUB_TOKEN fehlt in Netlify).' });
  }
  const token = sign({ typ: 'link', email, exp: Math.floor(Date.now() / 1000) + LINK_TTL, n: crypto.randomBytes(6).toString('hex') });
  const link = `${SITE_URL}/admin/#login=${token}`;
  const from = parseAddress(process.env.NOREPLY_EMAIL || process.env.FROM_EMAIL || 'Newness of Life <noreply@newnessoflife.de>', 'Newness of Life');

  const html = `<!doctype html><html><body style="margin:0;background:#F2F5FA;font-family:Arial,Helvetica,sans-serif;color:#15233B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border-top:4px solid #B98A3C" cellpadding="0" cellspacing="0">
  <tr><td style="padding:32px">
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px">Anmeldung im Website-Admin</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">Klicke auf den Button, um dich im Admin von newnessoflife.de anzumelden. Der Link gilt 20 Minuten.</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2350B8;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:8px">Jetzt anmelden</a></p>
    <p style="font-size:13px;line-height:1.6;color:#46546B;margin:0">Du hast keine Anmeldung angefordert? Dann ignoriere diese E-Mail einfach – ohne den Link kann sich niemand anmelden.</p>
  </td></tr></table></td></tr></table></body></html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: from,
      to: [{ email }],
      subject: 'Dein Anmelde-Link für den Website-Admin',
      htmlContent: html,
      textContent: `Anmeldung im Website-Admin von newnessoflife.de (gültig 20 Minuten):\n${link}\n\nNicht angefordert? Dann ignoriere diese E-Mail.`
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Brevo-Fehler', res.status, err);
    return json(502, { error: 'Die E-Mail konnte nicht verschickt werden. Bitte später noch einmal versuchen.' });
  }
  return json(200, generic);
}

function verifyLink(body) {
  const payload = verify(body.token, 'link');
  if (!payload) return json(401, { error: 'Der Anmelde-Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.' });
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  return json(200, { session: sign({ typ: 'session', email: payload.email, exp }), email: payload.email, exp });
}

async function loadContent() {
  const files = {};
  await Promise.all(CONTENT_FILES.map(async (p) => {
    try { files[p] = JSON.parse(await readFile(p)); } catch (err) { files[p] = null; console.error('Lesen fehlgeschlagen', p, err.message); }
  }));
  const images = await listImages();
  return json(200, { files, images });
}

async function saveContent(body, user) {
  const changes = body.files || {};
  const out = [];
  for (const [p, data] of Object.entries(changes)) {
    if (!CONTENT_FILES.includes(p)) return json(400, { error: `Diese Datei darf nicht geändert werden: ${p}` });
    if (!data || typeof data !== 'object') return json(400, { error: `Ungültiger Inhalt für ${p}` });
    out.push({ path: p, base64: Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64') });
  }
  if (!out.length) return json(400, { error: 'Es gibt nichts zu speichern.' });
  const names = out.map((f) => f.path.replace(/^data\/(pages\/)?/, '').replace('.json', '')).join(', ');
  const sha = await commitFiles(out, `Admin: ${names} aktualisiert (${user.email})`);
  return json(200, { ok: true, commit: sha });
}

async function uploadImage(body, user) {
  const name = String(body.name || 'bild').toLowerCase()
    .replace(/\.[a-z0-9]+$/, '').replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bild';
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[body.type];
  if (!ext) return json(400, { error: 'Bitte ein Bild im Format JPG, PNG, WebP oder GIF hochladen.' });
  const data = String(body.data || '').replace(/^data:[^;]+;base64,/, '');
  if (Buffer.from(data, 'base64').length > MAX_UPLOAD_BYTES) return json(400, { error: 'Das Bild ist zu groß (max. 4 MB).' });
  const stamp = new Date().toISOString().slice(0, 10);
  const filePath = `images/uploads/${stamp}-${name}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  // [skip netlify]: noch kein Neubau – die Seite wird beim nächsten "Speichern" gebaut
  await commitFiles([{ path: filePath, base64: data }], `Admin: Bild hochgeladen (${user.email}) [skip netlify]`);
  return json(200, { ok: true, path: '/' + filePath });
}

// ---------------------------------------------------------------------------

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Nur POST erlaubt.' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Ungültige Anfrage.' }); }

  try {
    if (body.action === 'request-link') return await requestLink(body);
    if (body.action === 'verify') return verifyLink(body);

    if (!process.env.GITHUB_TOKEN) {
      return json(500, { error: 'Der Admin ist noch nicht fertig eingerichtet: GITHUB_TOKEN fehlt in Netlify.' });
    }
    const user = sessionFrom(event);
    if (!user) return json(401, { error: 'Bitte melde dich erneut an.' });

    if (body.action === 'load') return await loadContent();
    if (body.action === 'save') return await saveContent(body, user);
    if (body.action === 'upload') return await uploadImage(body, user);
    return json(400, { error: 'Unbekannte Aktion.' });
  } catch (err) {
    console.error('Admin-API-Fehler', err);
    const msg = err.status === 401 || err.status === 403
      ? 'GitHub hat den Zugriff verweigert. Bitte den GITHUB_TOKEN in Netlify prüfen.'
      : err.status === 409 || err.status === 422
        ? 'Jemand anderes hat gerade gespeichert. Bitte die Seite neu laden und noch einmal speichern.'
        : 'Es ist ein Fehler aufgetreten. Bitte noch einmal versuchen.';
    return json(500, { error: msg });
  }
};
