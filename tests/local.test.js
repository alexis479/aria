'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLocalServer } = require('../dev-server');

test('local server serves public files and forwards requests to the API without exposing secrets', async t => {
  const server = createLocalServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = 'http://127.0.0.1:' + server.address().port;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /chat-input/);
  assert.match((await fetch(base + '/js/app.js')).headers.get('Content-Type'), /javascript/);
  for (const file of ['/.env.local', '/.git/config', '/api/aria.js', '/dev-server.js', '/js/../.env.local'])
    assert.equal((await fetch(base + file)).status, 404);
  const config = await (await fetch(base + '/api/aria')).json();
  assert.deepEqual(Object.keys(config), ['configured']);
  const invalid = await fetch(base + '/api/aria', { method: 'POST', body: '{broken' });
  assert.equal(invalid.status, 400);
});
