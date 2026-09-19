// tests/seed.test.js
// D-02: los datos de demo deben nacer de movimientos, no de existencias insertadas a mano.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase } = require('./apoyo');
const { cargarDatosDemo } = require('../seed');
const { ExistenciaPorBodega } = require('../src/models');

before(async () => { await prepararBase(); await cargarDatosDemo(); });

test('la auditoría cuadra al 100 % tras el seed', async () => {
  const res = await request(app).get('/api/inventario/auditoria');
  assert.equal(res.body.total, 10);
  assert.equal(res.body.descuadradas, 0);
});

test('la consulta obligatoria sigue mostrando 4 filas bajo mínimo y el teclado descontinuado', async () => {
  const res = await request(app).get('/api/inventario/existencias');
  assert.equal(res.body.length, 10);
  assert.equal(res.body.filter(f => f.bajo_minimo).length, 4);
  assert.equal(res.body.find(f => f.sku === 'TEC-005').estado_producto, 'DESCONTINUADO');
});

test('D-10: no se puede duplicar el par producto-bodega', async () => {
  const fila = await ExistenciaPorBodega.findOne();
  await assert.rejects(
    ExistenciaPorBodega.create({ producto_id: fila.producto_id, bodega_id: fila.bodega_id, cantidad_actual: 1, minimo: 0 }),
    /unique|UNIQUE/i
  );
});

test('M-06: cargarDatosDemo(registrar) reporta 5 mensajes de progreso', async () => {
  await prepararBase();
  const mensajes = [];
  await cargarDatosDemo(m => mensajes.push(m));
  assert.equal(mensajes.length, 5);
});
