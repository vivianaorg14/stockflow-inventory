// Caracteriza la consulta obligatoria de existencias
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase, entrada } = require('./apoyo');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

test('existencias por producto y bodega con bajo_minimo estrictamente menor', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 5);
  await entrada(resma.id, sur.id, 10);
  await request(app).put(`/api/inventario/existencias/${resma.id}/${norte.id}/minimo`).send({ minimo: 10 });
  await request(app).put(`/api/inventario/existencias/${resma.id}/${sur.id}/minimo`).send({ minimo: 10 });

  const res = await request(app).get('/api/inventario/existencias');
  assert.equal(res.status, 200);
  const norteFila = res.body.find(f => f.bodega === 'Norte');
  const surFila = res.body.find(f => f.bodega === 'Sur');
  assert.deepEqual(
    { sku: norteFila.sku, cantidad_actual: norteFila.cantidad_actual, minimo: norteFila.minimo, bajo_minimo: norteFila.bajo_minimo },
    { sku: 'PAP-001', cantidad_actual: 5, minimo: 10, bajo_minimo: true }
  );
  assert.equal(surFila.bajo_minimo, false, 'igual al mínimo no alerta');
});

test('D-09: fijar el mínimo crea la fila si no existe y valida el valor', async () => {
  const { toner } = cat.productos; const { central } = cat.bodegas;
  const ok = await request(app).put(`/api/inventario/existencias/${toner.id}/${central.id}/minimo`).send({ minimo: 15 });
  assert.equal(ok.status, 200);
  assert.deepEqual({ cantidad_actual: ok.body.cantidad_actual, minimo: ok.body.minimo }, { cantidad_actual: 0, minimo: 15 });

  const fila = (await request(app).get('/api/inventario/existencias')).body.find(f => f.sku === 'TON-002');
  assert.equal(fila.bajo_minimo, true);

  assert.equal((await request(app).put(`/api/inventario/existencias/${toner.id}/${central.id}/minimo`).send({ minimo: -1 })).status, 400);
  assert.equal((await request(app).put(`/api/inventario/existencias/9999/${central.id}/minimo`).send({ minimo: 1 })).status, 404);
});
