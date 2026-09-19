// tests/catalogo.test.js — productosController y bodegasController migrados a capturar() + errores tipados.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase } = require('./apoyo');

before(prepararBase);

test('SKU repetido responde 400, no 500', async () => {
  const primero = await request(app).post('/api/productos').send({ sku: 'DUP-001', nombre: 'Uno' });
  assert.equal(primero.status, 201);
  const repetido = await request(app).post('/api/productos').send({ sku: 'DUP-001', nombre: 'Dos' });
  assert.equal(repetido.status, 400);
  assert.match(repetido.body.error, /DUP-001/);
});

test('estado fuera de {ACTIVO, DESCONTINUADO} responde 400', async () => {
  const res = await request(app).post('/api/productos').send({ sku: 'EST-001', nombre: 'x', estado: 'LOQUESEA' });
  assert.equal(res.status, 400);
});

test('producto inexistente responde 404 al obtener o descontinuar', async () => {
  assert.equal((await request(app).get('/api/productos/9999')).status, 404);
  assert.equal((await request(app).patch('/api/productos/9999/descontinuar')).status, 404);
});
