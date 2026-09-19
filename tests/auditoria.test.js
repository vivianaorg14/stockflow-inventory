// tests/auditoria.test.js
// R3: el saldo actual debe poder reconstruirse sumando la historia de movimientos (D-01).
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase, entrada } = require('./apoyo');
const { sequelize } = require('../src/models');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

test('tras entradas, traslados, salidas, ajustes y despachos todo cuadra', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 100);
  await request(app).post('/api/movimientos').send({ tipo: 'TRASLADO', producto_id: resma.id, bodega_origen_id: norte.id, bodega_destino_id: sur.id, cantidad: 40 });
  await request(app).post('/api/movimientos').send({ tipo: 'SALIDA', producto_id: resma.id, bodega_origen_id: sur.id, cantidad: 10 });
  await request(app).post('/api/movimientos').send({ tipo: 'AJUSTE', sentido: 'SALIDA', producto_id: resma.id, bodega_origen_id: norte.id, cantidad: 3, notas: 'merma' });
  const pedido = (await request(app).post('/api/pedidos').send({ items: [{ producto_id: resma.id, cantidad_solicitada: 20 }] })).body;
  await request(app).post(`/api/pedidos/${pedido.id}/despachar`).send({ despachos: [{ item_pedido_id: pedido.items[0].id, bodega_id: sur.id, cantidad: 20 }] });

  const res = await request(app).get('/api/inventario/auditoria');
  assert.equal(res.status, 200);
  assert.equal(res.body.descuadradas, 0);
  const norteFila = res.body.filas.find(f => f.bodega === 'Norte');
  const surFila = res.body.filas.find(f => f.bodega === 'Sur');
  assert.deepEqual([norteFila.saldo_materializado, norteFila.saldo_historia, norteFila.cuadra], [57, 57, true]);
  assert.deepEqual([surFila.saldo_materializado, surFila.saldo_historia, surFila.cuadra], [10, 10, true]);
});

test('un saldo alterado por fuera de la historia se detecta como descuadre', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  // Única excepción a "nunca SQL crudo": simular corrupción que la API no permite.
  await sequelize.query('UPDATE existencias_por_bodega SET cantidad_actual = 99');

  const res = await request(app).get('/api/inventario/auditoria');
  assert.equal(res.body.descuadradas, 1);
  const fila = res.body.filas[0];
  assert.deepEqual([fila.saldo_materializado, fila.saldo_historia, fila.cuadra], [99, 10, false]);
});
