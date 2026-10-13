'use strict';
// Prüft, dass die Seiten gebaut werden und alle Inhalte aus data/ kommen.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = ['index', 'gottesdienste', 'ueber-uns', 'veranstaltungen', 'spenden', 'impressum', 'datenschutz'];

test('Build läuft ohne Fehler', () => {
  execFileSync(process.execPath, [path.join(root, 'build.js')], { cwd: root, stdio: 'pipe' });
});

for (const page of pages) {
  test(`${page}.html: keine offenen Platzhalter, Titel vorhanden`, () => {
    const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
    assert.ok(!/\{\{|\}\}/.test(html), 'Unaufgelöste {{ }} gefunden');
    assert.match(html, /<title>[^<]{5,}<\/title>/);
    assert.ok(!/data-t="[^"]*"><\/(h1|h2)>/.test(html), 'Leere Überschrift gefunden');
  });
}

test('Admin-Inhalte: alle Dateien sind gültiges JSON', () => {
  const files = ['settings', 'global', 'homepage', 'events', 'pages/gottesdienste', 'pages/ueber-uns',
    'pages/veranstaltungen', 'pages/spenden', 'pages/impressum', 'pages/datenschutz'];
  for (const f of files) JSON.parse(fs.readFileSync(path.join(root, 'data', f + '.json'), 'utf8'));
});
