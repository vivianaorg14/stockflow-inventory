// tests/catalogo.test.js — productosController y bodegasController migrados a capturar() + errores tipados.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, tokenMenorSetup } = require('./apoyo');

before(prepararBase);

test('SKU repetido responde 400, no 500', async () => {
  const token = tokenMenorSetup();
  const primero = await request(app).post('/api/productos').set('Authorization', `Bearer ${token}`).send({ sku: 'DUP-001', nombre: 'Uno' });
  assert.equal(primero.status, 201);
  const repetido = await request(app).post('/api/productos').set('Authorization', `Bearer ${token}`).send({ sku: 'DUP-001', nombre: 'Dos' });
  assert.equal(repetido.status, 400);
  assert.match(repetido.body.error, /DUP-001/);
});

test('estado fuera de {ACTIVO, DESCONTINUADO} responde 400', async () => {
  const token = tokenMenorSetup();
  const res = await request(app).post('/api/productos').set('Authorization', `Bearer ${token}`).send({ sku: 'EST-001', nombre: 'x', estado: 'LOQUESEA' });
  assert.equal(res.status, 400);
});

test('producto inexistente responde 404 al obtener o descontinuar', async () => {
  assert.equal((await request(app).get('/api/productos/9999')).status, 404);
  assert.equal((await request(app).patch('/api/productos/9999/descontinuar')).status, 404);
});

test('crear producto con inicializar_existencias crea filas en existencias por bodega', async () => {
  const token = tokenMenorSetup();
  await request(app).post('/api/bodegas').send({ nombre: 'Bodega Test', ubicacion: 'Test' });
  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send({ sku: 'INI-001', nombre: 'Inicializado', inicializar_existencias: true });
  assert.equal(res.status, 201);
  const existencias = await request(app).get('/api/inventario/existencias');
  const creadas = existencias.body.filter(e => e.sku === 'INI-001');
  assert.ok(creadas.length >= 1, 'Debe haber filas en existencias para el nuevo producto');
  assert.equal(creadas[0].cantidad_actual, 0);
  assert.equal(creadas[0].minimo, 0);
});

