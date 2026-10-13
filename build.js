// build.js – erzeugt die HTML-Seiten aus src/ (Vorlagen) und data/ (Inhalte).
//
// Inhalte kommen ausschließlich aus data/*.json (bearbeitbar über /admin).
// In den Vorlagen werden Elemente mit Pfaden markiert:
//   data-t="homepage.hero.title"        -> Text (Zeilenumbrüche werden zu <br>)
//   data-t-html="pages.impressum.content_html" -> HTML-Inhalt
//   data-src / data-href / data-bg / data-placeholder="pfad" -> Attribute
// Gibt es neben einem Feld ein Feld mit Endung "_en", wird es als data-en
// (bzw. data-en-html / data-en-placeholder) ausgegeben; js/i18n.js zeigt es
// an, wenn Besucher auf "EN" umschalten.
'use strict';

const fs = require('fs').promises;
const path = require('path');
const posthtml = require('posthtml');
const include = require('posthtml-include');
const expressions = require('posthtml-expressions');

const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SITE_URL = 'https://newnessoflife.de';

async function loadJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8'));
  } catch (err) {
    console.warn(`Warnung: ${file} konnte nicht gelesen werden:`, err.message);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function getPath(obj, p) {
  return String(p).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function getEnPath(obj, p) {
  const parts = String(p).split('.');
  const last = parts.pop();
  const parent = parts.length ? getPath(obj, parts.join('.')) : obj;
  return parent && typeof parent === 'object' ? parent[last + '_en'] : undefined;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function isFilled(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function cssUrl(value) {
  return `url('${String(value).replace(/'/g, '%27').replace(/ /g, '%20')}')`;
}

// ---------------------------------------------------------------------------
// posthtml-Plugin: füllt markierte Elemente mit Inhalten
// ---------------------------------------------------------------------------

function fillPlugin(locals) {
  return function (tree) {
    tree.walk((node) => {
      if (!node || !node.attrs) return node;
      const a = node.attrs;

      if (a['data-t']) {
        const v = getPath(locals, a['data-t']);
        if (isFilled(v)) node.content = [textToHtml(v)];
        const en = getEnPath(locals, a['data-t']);
        if (isFilled(en)) a['data-en'] = escapeHtml(en).replace(/\r?\n/g, '&#10;');
      }
      if (a['data-t-html']) {
        const v = getPath(locals, a['data-t-html']);
        if (isFilled(v)) node.content = [String(v)];
        const en = getEnPath(locals, a['data-t-html']);
        if (isFilled(en)) a['data-en-html'] = escapeHtml(en);
      }
      if (a['data-placeholder']) {
        const v = getPath(locals, a['data-placeholder']);
        if (isFilled(v)) a.placeholder = escapeHtml(v);
        const en = getEnPath(locals, a['data-placeholder']);
        if (isFilled(en)) a['data-en-placeholder'] = escapeHtml(en);
        delete a['data-placeholder'];
      }
      if (a['data-src']) {
        const v = getPath(locals, a['data-src']);
        if (isFilled(v)) a.src = escapeHtml(v);
        delete a['data-src'];
      }
      if (a['data-href']) {
        const v = getPath(locals, a['data-href']);
        if (isFilled(v)) a.href = escapeHtml(v);
        delete a['data-href'];
      }
      if (a['data-bg']) {
        const v = getPath(locals, a['data-bg']);
        if (isFilled(v)) {
          a.style = `${a.style ? a.style + '; ' : ''}background-image: ${cssUrl(v)}`;
        } else {
          a.class = `${a.class || ''} no-image`.trim();
        }
        delete a['data-bg'];
      }
      return node;
    });
    return tree;
  };
}

// ---------------------------------------------------------------------------
// Veranstaltungen
// ---------------------------------------------------------------------------

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Datum ohne Zeitzonen-Verschiebung lesen ("2026-11-28T19:00" = Ortszeit Mainz)
function parseLocal(str) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : 0 };
}

function weekday(p, lang) {
  const names = lang === 'en'
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return names[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
}

function formatDate(p, lang) {
  if (!p) return '';
  const monthsLong = lang === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const date = lang === 'en'
    ? `${weekday(p, lang)}, ${p.d} ${monthsLong[p.mo - 1]} ${p.y}`
    : `${weekday(p, lang)}, ${p.d}. ${monthsLong[p.mo - 1]} ${p.y}`;
  if (p.h === null) return date;
  const hh = String(p.h).padStart(2, '0');
  const mm = String(p.mi).padStart(2, '0');
  if (lang === 'en') {
    const h12 = ((p.h + 11) % 12) + 1;
    return `${date}, ${h12}:${mm} ${p.h < 12 ? 'am' : 'pm'}`;
  }
  return `${date}, ${hh}:${mm} Uhr`;
}

function icsStamp(p, addHours) {
  if (!p) return '';
  const d = new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h || 0, p.mi || 0) + (addHours || 0) * 3600e3);
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15);
}

function prepareEvents(raw) {
  const categories = raw.categories || [];
  const today = new Date();
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const items = (raw.items || [])
    .filter((e) => e && e.published !== false && parseLocal(e.date))
    .map((e) => {
      const p = parseLocal(e.date);
      const pe = parseLocal(e.end_date);
      const cat = categories.find((c) => c.id === e.category) || {};
      const last = pe || p;
      const startStamp = icsStamp(p);
      const endStamp = pe ? icsStamp(pe) : icsStamp(p, p.h === null ? 24 : 2);
      const calText = encodeURIComponent(e.title || '');
      const calDetails = encodeURIComponent(e.description || '');
      const calLoc = encodeURIComponent(`${e.location || ''} – Hebbelstr. 56-60, 55127 Mainz`);
      return {
        ...e,
        key: last.y * 10000 + last.mo * 100 + last.d,
        sort: e.date,
        day: p.d,
        month_short: MONTHS_DE[p.mo - 1],
        month_short_en: MONTHS_EN[p.mo - 1],
        month_key: `${p.y}-${String(p.mo).padStart(2, '0')}`,
        date_label: pe ? `${formatDate(p, 'de')} bis ${formatDate(pe, 'de')}` : formatDate(p, 'de'),
        date_label_en: pe ? `${formatDate(p, 'en')} to ${formatDate(pe, 'en')}` : formatDate(p, 'en'),
        category_name: cat.name || '',
        category_name_en: cat.name_en || cat.name || '',
        category_color: cat.color || '#2350B8',
        calendar_link: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calText}&dates=${startStamp}/${endStamp}&ctz=Europe/Berlin&details=${calDetails}&location=${calLoc}`
      };
    })
    .filter((e) => e.key >= todayKey)
    .sort((a, b) => String(a.sort).localeCompare(String(b.sort)));

  const monthFmt = (e, lang) => {
    const p = parseLocal(e.date);
    const names = lang === 'en'
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${names[p.mo - 1]} ${p.y}`;
  };
  const byMonth = [];
  for (const e of items) {
    let bucket = byMonth.find((b) => b.key === e.month_key);
    if (!bucket) {
      bucket = { key: e.month_key, label: monthFmt(e, 'de'), label_en: monthFmt(e, 'en'), items: [] };
      byMonth.push(bucket);
    }
    bucket.items.push(e);
  }
  return { items, byMonth, categories };
}

// ---------------------------------------------------------------------------
// SEO: strukturierte Daten & Sitemap
// ---------------------------------------------------------------------------

function jsonLdScript(obj) {
  const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function buildEventsJsonLd(events) {
  const address = {
    '@type': 'PostalAddress', streetAddress: 'Hebbelstr. 56-60', postalCode: '55127',
    addressLocality: 'Mainz', addressRegion: 'Rheinland-Pfalz', addressCountry: 'DE'
  };
  const graph = events.map((e) => {
    const item = {
      '@type': 'Event',
      name: `${e.title} – Newness of Life Mainz`,
      startDate: e.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: 'Newness of Life Mainz', address },
      organizer: { '@type': 'Organization', name: 'Newness of Life Mainz', url: `${SITE_URL}/` }
    };
    if (e.end_date) item.endDate = e.end_date;
    if (e.description) item.description = String(e.description).replace(/<[^>]*>/g, '').trim();
    if (e.image) item.image = `${SITE_URL}/${String(e.image).replace(/^\//, '')}`;
    return item;
  });
  return graph.length ? jsonLdScript({ '@context': 'https://schema.org', '@graph': graph }) : '';
}

// Kirchen-Daten für Google immer aus den aktuellen Kontaktdaten übernehmen
function churchFromSettings(church, settings) {
  const c = JSON.parse(JSON.stringify(church));
  const contact = settings.contact || {};
  if (contact.address) c.address.streetAddress = contact.address;
  const m = String(contact.city || '').match(/^(\d{5})\s+(.+)$/);
  if (m) { c.address.postalCode = m[1]; c.address.addressLocality = m[2]; }
  if (contact.email) c.email = contact.email;
  if (contact.phone) c.telephone = contact.phone;
  const social = Object.values(settings.social_media || {}).filter(Boolean);
  if (social.length) c.sameAs = social;
  return c;
}

async function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ['/', 'weekly', '1.0'], ['/gottesdienste', 'monthly', '0.9'], ['/veranstaltungen', 'weekly', '0.8'],
    ['/ueber-uns', 'monthly', '0.8'], ['/spenden', 'yearly', '0.5'], ['/impressum', 'yearly', '0.2'],
    ['/datenschutz', 'yearly', '0.2']
  ];
  const body = urls.map(([loc, freq, prio]) =>
    `  <url>\n    <loc>${SITE_URL}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`
  ).join('\n');
  await fs.writeFile(path.join(ROOT_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  console.log('✓ sitemap.xml');
}

// ---------------------------------------------------------------------------
// Seiten rendern
// ---------------------------------------------------------------------------

async function renderPage(file, locals) {
  const src = path.join(PAGES_DIR, file);
  const html = await fs.readFile(src, 'utf8');
  const pageLocals = { ...locals, currentPage: file.replace(/\.html$/, '') };
  const result = await posthtml([
    include({ root: SRC_DIR }),
    expressions({ locals: pageLocals, strictMode: false }),
    fillPlugin(pageLocals)
  ]).process(html);
  await fs.writeFile(path.join(ROOT_DIR, file), result.html);
  console.log(`✓ ${file}`);
}

async function build() {
  console.log('\nWebsite wird gebaut ...\n');
  const [settings, global, homepage, eventsRaw, seoJsonLd, gottesdienste, ueberUns, spenden, impressum, datenschutz, veranstaltungen] =
    await Promise.all([
      loadJson('settings.json'), loadJson('global.json'), loadJson('homepage.json'), loadJson('events.json'),
      loadJson('seo-jsonld.json'), loadJson('pages/gottesdienste.json'), loadJson('pages/ueber-uns.json'),
      loadJson('pages/spenden.json'), loadJson('pages/impressum.json'), loadJson('pages/datenschutz.json'),
      loadJson('pages/veranstaltungen.json')
    ]);

  const events = prepareEvents(eventsRaw);
  const homeCount = parseInt((homepage.events_section || {}).count, 10) || 3;

  const locals = {
    settings,
    global,
    homepage,
    pages: { gottesdienste, ueberUns, spenden, impressum, datenschutz, veranstaltungen },
    events: events.items,
    eventsByMonth: events.byMonth,
    upcomingEvents: events.items.slice(0, homeCount),
    year: new Date().getFullYear(),
    churchJsonLd: seoJsonLd.church ? jsonLdScript(churchFromSettings(seoJsonLd.church, settings)) : '',
    servicesJsonLd: seoJsonLd.services ? jsonLdScript(seoJsonLd.services) : '',
    eventsJsonLd: buildEventsJsonLd(events.items)
  };

  const files = (await fs.readdir(PAGES_DIR)).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    await renderPage(f, locals);
  }
  await writeSitemap();
  console.log(`\nFertig: ${files.length} Seiten.\n`);
}

build().catch((err) => {
  console.error('\nBuild fehlgeschlagen:', err);
  process.exit(1);
});
