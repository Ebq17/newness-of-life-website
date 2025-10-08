// js/build.js
'use strict';

const fs = require('fs').promises;
const path = require('path');
const posthtml = require('posthtml');
const include = require('posthtml-include');
const expressions = require('posthtml-expressions');

const ROOT_DIR = __dirname;
const SRC_DIR   = path.join(ROOT_DIR, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const DATA_DIR  = path.join(ROOT_DIR, 'data');

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
    console.error(`Error reading or parsing JSON: ${filePath}`, err);
    return {};
  }
}

/**
 * Events filtern, sortieren und Datum formatieren.
 * @param {object} eventsRaw
 * @returns {Array<object>}
 */
function prepareEvents(eventsRaw) {
  const items = eventsRaw.items || [];
  return items
    .filter(e => e.published !== false)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({
      ...e,
      date_de:
        new Date(e.date).toLocaleString('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) + ' Uhr'
    }));
}

/**
 * Einzelne Seite rendern.
 * @param {string} file
 * @param {object} locals
 */
async function renderPage(file, locals) {
  const src  = path.join(PAGES_DIR, file);
  const dest = path.join(ROOT_DIR, file);

  try {
    const html = await fs.readFile(src, 'utf8');
    const result = await posthtml([
      include({ root: SRC_DIR }),
      expressions({ locals })
    ]).process(html);

    await fs.writeFile(dest, result.html);
    console.log(`Built ${file}`);
  } catch (err) {
    console.error(`Error processing file ${file}:`, err);
  }
}

/**
 * Haupt-Build.
 */
async function build() {
  try {
    // Daten parallel laden
    const [homepage, eventsRaw, settings] = await Promise.all([
      loadJson(path.join(DATA_DIR, 'homepage.json')),
      loadJson(path.join(DATA_DIR, 'events.json')),
      loadJson(path.join(DATA_DIR, 'settings.json'))
    ]);

    const events = prepareEvents(eventsRaw);
    const locals = { homepage, events, settings };

    // Seiten finden & rendern
    const files = (await fs.readdir(PAGES_DIR)).filter(f => f.endsWith('.html'));
    await Promise.all(files.map(f => renderPage(f, locals)));
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
