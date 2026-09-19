// tests/arranque.test.js
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase } = require('./apoyo');

before(prepararBase);

test('la API responde bajo /api y no en la raíz de cada recurso', async () => {
  const conPrefijo = await request(app).get('/api/productos');
  assert.equal(conPrefijo.status, 200);
  assert.deepEqual(conPrefijo.body, []);

  const sinPrefijo = await request(app).get('/productos');
  assert.equal(sinPrefijo.status, 404);
});

test('JSON malformado responde 400 con { error } en vez de 500', async () => {
  const res = await request(app).post('/api/movimientos')
    .set('Content-Type', 'application/json')
    .send('{');
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('la raíz sirve el frontend y /api el mapa de endpoints', async () => {
  const html = await request(app).get('/');
  assert.equal(html.status, 200);
  assert.match(html.headers['content-type'], /text\/html/);
  assert.match(html.text, /StockFlow/);

  const mapa = await request(app).get('/api');
  assert.equal(mapa.status, 200);
  assert.equal(mapa.body.endpoints.auditoria, '/api/inventario/auditoria');
});

test('M-03: la raíz declara un favicon para no dar 404 en consola', async () => {
  const html = await request(app).get('/');
  assert.match(html.text, /rel="icon"/);
});
