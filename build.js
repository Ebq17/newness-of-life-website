// build.js
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
const PAGES_DATA_DIR = path.join(DATA_DIR, 'pages');

/**
 * JSON-Datei laden und parsen.
 * @param {string} filePath
 * @returns {Promise<object>}
 */
async function loadJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Warning: Could not load ${filePath}`, err.message);
    return {};
  }
}

/**
 * Events filtern, sortieren und Datum formatieren.
 * @param {object} eventsRaw
 * @returns {object}
 */
function prepareEvents(eventsRaw) {
  const items = eventsRaw.items || [];
  const categories = eventsRaw.categories || [];

  // Cutoff: 2 weeks ago
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const processedItems = items
    // Only published events
    .filter(e => e.published === true)
    // Hide events older than 2 weeks
    .filter(e => new Date(e.date) >= twoWeeksAgo)
    // Sort by date (upcoming first)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => {
      // Kategorie-Infos hinzufügen
      const category = categories.find(c => c.id === e.category) || {};

      const dateObj = new Date(e.date);
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

      return {
        ...e,
        date_de: formatDateDE(e.date),
        end_date_de: e.end_date ? formatDateDE(e.end_date) : '',
        day: dateObj.getDate(),
        monthShort: monthNames[dateObj.getMonth()],
        category_name: category.name || '',
        // Use custom color/icon if set, otherwise fall back to category defaults
        category_color: e.color || category.color || '#2563EB',
        category_icon: e.icon || category.icon || 'fa-calendar'
      };
    });

  // Featured Events separieren
  const featuredEvents = processedItems.filter(e => e.featured);
  const regularEvents = processedItems.filter(e => !e.featured);

  return {
    all: processedItems,
    featured: featuredEvents,
    regular: regularEvents,
    categories: categories
  };
}

/**
 * Datum ins deutsche Format konvertieren.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateDE(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' Uhr';
}

/**
 * Team-Mitglieder filtern und sortieren.
 * @param {object} teamRaw
 * @returns {object}
 */
function prepareTeam(teamRaw) {
  const members = teamRaw.members || [];

  const processedMembers = members
    .filter(m => m.published !== false)
    .sort((a, b) => (a.order || 999) - (b.order || 999));

  return {
    page: teamRaw.page || {},
    members: processedMembers
  };
}

/**
 * Einzelne Seite rendern.
 * @param {string} file
 * @param {object} locals
 */
async function renderPage(file, locals) {
  const src = path.join(PAGES_DIR, file);
  const dest = path.join(ROOT_DIR, file);

  try {
    const html = await fs.readFile(src, 'utf8');
    const localsForPage = { ...locals, currentPage: file };
    const result = await posthtml([
      include({ root: SRC_DIR }),
      expressions({ locals: localsForPage })
    ]).process(html);

    await fs.writeFile(dest, result.html);
    console.log(`✓ Built ${file}`);
  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err.message);
  }
}

/**
 * Haupt-Build.
 */
async function build() {
  console.log('\n🔨 Building website...\n');

  try {
    // Alle Daten parallel laden
    const [
      homepage,
      eventsRaw,
      settings,
      design,
      teamRaw,
      global,
      pageUeberUns,
      pageGottesdienste,
      pageSpenden,
      pageDatenschutz,
      pageImpressum
    ] = await Promise.all([
      loadJson(path.join(DATA_DIR, 'homepage.json')),
      loadJson(path.join(DATA_DIR, 'events.json')),
      loadJson(path.join(DATA_DIR, 'settings.json')),
      loadJson(path.join(DATA_DIR, 'design.json')),
      loadJson(path.join(DATA_DIR, 'team.json')),
      loadJson(path.join(DATA_DIR, 'global.json')),
      loadJson(path.join(PAGES_DATA_DIR, 'ueber-uns.json')),
      loadJson(path.join(PAGES_DATA_DIR, 'gottesdienste.json')),
      loadJson(path.join(PAGES_DATA_DIR, 'spenden.json')),
      loadJson(path.join(PAGES_DATA_DIR, 'datenschutz.json')),
      loadJson(path.join(PAGES_DATA_DIR, 'impressum.json'))
    ]);

    // Daten aufbereiten
    const events = prepareEvents(eventsRaw);
    const team = prepareTeam(teamRaw);
    const homepageEventsSource = homepage.events_section && homepage.events_section.featured_only
      ? events.featured
      : events.all;
    const homepageEventsCount = parseInt(homepage.events_section && homepage.events_section.show_count, 10);
    const homepageEvents = Number.isFinite(homepageEventsCount)
      ? homepageEventsSource.slice(0, homepageEventsCount)
      : homepageEventsSource;

    // Alle Daten für Templates zusammenfassen
    const locals = {
      // Globale Daten
      settings,
      design,

      // Header, Footer, Service Cards (aus global.json)
      header: global.header || {},
      footer: global.footer || {},
      service_cards: (global.service_cards || []),

      // Startseite
      homepage,

      // Events (mehrere Varianten)
      events: events.all,
      featuredEvents: events.featured,
      regularEvents: events.regular,
      eventCategories: events.categories,
      homepageEvents,

      // Team
      team: team.members,
      teamPage: team.page,

      // Seiteninhalte
      pages: {
        ueberUns: pageUeberUns,
        gottesdienste: pageGottesdienste,
        spenden: pageSpenden,
        datenschutz: pageDatenschutz,
        impressum: pageImpressum
      }
    };

    // Seiten finden & rendern
    const files = (await fs.readdir(PAGES_DIR)).filter(f => f.endsWith('.html'));
    await Promise.all(files.map(f => renderPage(f, locals)));

    console.log(`\n✅ Build complete! ${files.length} pages generated.\n`);
  } catch (err) {
    console.error('\n❌ Build failed:', err);
    process.exit(1);
  }
}

build();
