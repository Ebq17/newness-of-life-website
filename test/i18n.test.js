'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

function getValueAtPath(obj, keyPath) {
  const parts = String(keyPath).split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    // Support arrays (e.g. "services_page.main_service_features.0.title")
    const next = Array.isArray(cur) ? cur[Number(part)] : cur[part];
    if (next === undefined) return undefined;
    cur = next;
  }
  return cur;
}

function extractI18nKeys(html) {
  const keys = new Set();
  const re = /\bdata-i18n(?:-html|-placeholder)?="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const key = (m[1] || '').trim();
    if (!key) continue;
    keys.add(key);
  }
  return keys;
}

function flattenStringLeaves(obj, prefix = '', out = new Set()) {
  if (obj == null) return out;
  if (typeof obj === 'string') {
    out.add(prefix);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((val, idx) => {
      const p = prefix ? `${prefix}.${idx}` : String(idx);
      flattenStringLeaves(val, p, out);
    });
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      flattenStringLeaves(v, p, out);
    }
  }
  return out;
}

test('i18n uses a relative translations.json fetch path', async () => {
  const js = await fs.readFile(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
  assert.ok(!js.includes("fetch('/data/translations.json')"));
});

test('translations.json has matching key paths for de and en', async () => {
  const translations = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', 'data', 'translations.json'), 'utf8')
  );

  const de = flattenStringLeaves(translations.de);
  const en = flattenStringLeaves(translations.en);

  const onlyDe = [...de].filter((k) => !en.has(k)).sort();
  const onlyEn = [...en].filter((k) => !de.has(k)).sort();

  assert.equal(onlyDe.length, 0, `Keys only in de:\n${onlyDe.slice(0, 50).join('\n')}`);
  assert.equal(onlyEn.length, 0, `Keys only in en:\n${onlyEn.slice(0, 50).join('\n')}`);
});

test('all data-i18n keys used in built HTML exist in both languages', async () => {
  const root = path.join(__dirname, '..');
  const translations = JSON.parse(await fs.readFile(path.join(root, 'data', 'translations.json'), 'utf8'));

  const files = (await fs.readdir(root)).filter((f) => f.endsWith('.html'));
  const keys = new Set();

  for (const file of files) {
    const html = await fs.readFile(path.join(root, file), 'utf8');
    for (const k of extractI18nKeys(html)) keys.add(k);
  }

  const missing = [];
  const nonString = [];

  for (const key of keys) {
    for (const lang of ['de', 'en']) {
      const val = getValueAtPath(translations[lang], key);
      if (val === undefined) {
        missing.push(`${lang}:${key}`);
        continue;
      }
      if (typeof val !== 'string') {
        nonString.push(`${lang}:${key} (type=${typeof val})`);
      }
    }
  }

  assert.equal(missing.length, 0, `Missing translations:\n${missing.sort().join('\n')}`);
  assert.equal(nonString.length, 0, `Non-string translations:\n${nonString.sort().join('\n')}`);
});

