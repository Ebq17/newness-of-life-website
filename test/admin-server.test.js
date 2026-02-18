'use strict';

process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');

const { createRequestHandler } = require('../admin-server');

const handler = createRequestHandler();

function createMockReq({ method, url, headers, body, remoteAddress }) {
  const req = body != null ? Readable.from([body]) : Readable.from([]);
  req.method = method;
  req.url = url;
  req.headers = headers || {};
  req.socket = { remoteAddress: remoteAddress || '127.0.0.1' };
  return req;
}

function createMockRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = Buffer.from('');
  res.writeHead = (statusCode, headers) => {
    res.statusCode = statusCode;
    Object.assign(res.headers, headers || {});
  };
  res.end = (data) => {
    if (data == null) {
      res.body = Buffer.from('');
    } else if (Buffer.isBuffer(data)) {
      res.body = data;
    } else {
      res.body = Buffer.from(String(data));
    }
    res.emit('finish');
  };
  return res;
}

async function runRequest({ method, url, headers, body, remoteAddress }) {
  const req = createMockReq({ method, url, headers, body, remoteAddress });
  const res = createMockRes();
  await handler(req, res);
  return { status: res.statusCode, headers: res.headers, body: res.body };
}

function parseJsonBody(res) {
  return JSON.parse(res.body.toString('utf8') || '{}');
}

test('GET /api/status', async () => {
  const res = await runRequest({ method: 'GET', url: '/api/status' });
  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.equal(json.status, 'ok');
  assert.ok(json.time);
});

test('GET /api/images returns an array', async () => {
  const res = await runRequest({ method: 'GET', url: '/api/images' });
  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.ok(Array.isArray(json));
  if (json[0]) {
    assert.equal(typeof json[0].name, 'string');
    assert.equal(typeof json[0].url, 'string');
    assert.ok(json[0].url.startsWith('/images/'));
  }
});

test('DELETE /api/images deletes a file inside images directory', async (t) => {
  const imagesDir = path.join(__dirname, '..', 'images');
  const fileName = `delete-test-${Date.now()}.png`;
  const filePath = path.join(imagesDir, fileName);
  await fs.writeFile(filePath, Buffer.from('test-image'), 'utf8');

  t.after(async () => {
    try {
      await fs.unlink(filePath);
    } catch {}
  });

  const res = await runRequest({
    method: 'DELETE',
    url: '/api/images',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: `/images/${fileName}` })
  });

  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.equal(json.success, true);
  assert.equal(json.deleted, `/images/${fileName}`);

  await assert.rejects(fs.access(filePath));
});

test('DELETE /api/images rejects invalid urls', async () => {
  const res = await runRequest({
    method: 'DELETE',
    url: '/api/images',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: '../secret.txt' })
  });
  assert.equal(res.status, 400);
  const json = parseJsonBody(res);
  assert.equal(json.error, 'Invalid image URL');
});

test('DELETE /api/images accepts absolute image URLs', async (t) => {
  const imagesDir = path.join(__dirname, '..', 'images');
  const fileName = `delete-abs-test-${Date.now()}.png`;
  const filePath = path.join(imagesDir, fileName);
  await fs.writeFile(filePath, Buffer.from('test-image'), 'utf8');

  t.after(async () => {
    try {
      await fs.unlink(filePath);
    } catch {}
  });

  const absoluteUrl = `http://localhost:8080/images/${fileName}`;
  const res = await runRequest({
    method: 'DELETE',
    url: `/api/images?url=${encodeURIComponent(absoluteUrl)}`
  });
  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.equal(json.success, true);
  assert.equal(json.deleted, `/images/${fileName}`);
  await assert.rejects(fs.access(filePath));
});

test('GET/PUT /api/data/homepage.json roundtrip', async (t) => {
  const homepagePath = path.join(__dirname, '..', 'data', 'homepage.json');
  const originalRaw = await fs.readFile(homepagePath, 'utf8');
  t.after(async () => {
    await fs.writeFile(homepagePath, originalRaw, 'utf8');
  });

  const get1 = await runRequest({ method: 'GET', url: '/api/data/homepage.json' });
  assert.equal(get1.status, 200);
  const data1 = parseJsonBody(get1);

  const next = structuredClone(data1);
  next.hero = next.hero || {};
  next.hero.title = `TEST-${Date.now()}`;

  const put = await runRequest({
    method: 'PUT',
    url: '/api/data/homepage.json',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(next)
  });
  assert.equal(put.status, 200);

  const get2 = await runRequest({ method: 'GET', url: '/api/data/homepage.json' });
  assert.equal(get2.status, 200);
  const data2 = parseJsonBody(get2);
  assert.equal(data2.hero.title, next.hero.title);
});

test('POST /api/build succeeds', async () => {
  const res = await runRequest({ method: 'POST', url: '/api/build' });
  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.equal(json.success, true);
});

test('POST /api/contact stores request and returns a ticketId', async (t) => {
  const contactsPath = path.join(__dirname, '..', 'data', 'contacts.json');
  let hadContacts = true;
  let originalRaw = '';
  try {
    originalRaw = await fs.readFile(contactsPath, 'utf8');
  } catch {
    hadContacts = false;
  }
  t.after(async () => {
    if (hadContacts) {
      await fs.writeFile(contactsPath, originalRaw, 'utf8');
      return;
    }
    // If file did not exist before, clean it up.
    try {
      await fs.unlink(contactsPath);
    } catch {}
  });

  const payload = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Spende Frage',
    message: 'Ich habe eine Spendenquittung Frage.',
    website: ''
  };

  const res = await runRequest({
    method: 'POST',
    url: '/api/contact',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200);
  const json = parseJsonBody(res);
  assert.equal(json.success, true);
  assert.ok(json.ticketId);
  assert.equal(json.category, 'Spende');

  const contactsRaw = await fs.readFile(contactsPath, 'utf8');
  const contacts = JSON.parse(contactsRaw);
  assert.ok(Array.isArray(contacts.items));
  assert.ok(contacts.items.find((i) => i.ticketId === json.ticketId));
});
