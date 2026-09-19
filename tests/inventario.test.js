// tests/inventario.test.js
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase } = require('./apoyo');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

test('fijar mínimo con ids no numéricos responde 400, no 500', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  const idProductoInvalido = await request(app)
    .put(`/api/inventario/existencias/abc/${norte.id}/minimo`).send({ minimo: 5 });
  assert.equal(idProductoInvalido.status, 400);

  const idBodegaInvalido = await request(app)
    .put(`/api/inventario/existencias/${resma.id}/abc/minimo`).send({ minimo: 5 });
  assert.equal(idBodegaInvalido.status, 400);
});
