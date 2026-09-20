// tests/pedidos.test.js
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase, entrada, existencia } = require('./apoyo');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

const crear = (items, descripcion = 'p') => request(app).post('/api/pedidos').send({ descripcion, items });

test('D-07: un ítem inválido no deja pedido huérfano', async () => {
  const { resma } = cat.productos;
  const decimal = await crear([{ producto_id: resma.id, cantidad_solicitada: 1.5 }]);
  assert.equal(decimal.status, 400);
  const inexistente = await crear([{ producto_id: 9999, cantidad_solicitada: 1 }]);
  assert.equal(inexistente.status, 404);
  const vacio = await crear([]);
  assert.equal(vacio.status, 400);

  assert.deepEqual((await request(app).get('/api/pedidos')).body, []);
});

test('D-08: la cantidad de un despacho debe ser entera positiva', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 5 }])).body;
  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: pedido.items[0].id, bodega_id: norte.id, cantidad: 2.5 }] });
  assert.equal(res.status, 400);
  assert.equal(await existencia(resma.id, norte.id), 10);
});

test('M-04: item_pedido_id llega como string desde un formulario y despacha igual', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 5 }])).body;
  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: String(pedido.items[0].id), bodega_id: norte.id, cantidad: 5 }] });
  assert.equal(res.status, 200);
  assert.equal(await existencia(resma.id, norte.id), 5);
});

test('M-04: item_pedido_id no numérico responde 400, no 404', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 5 }])).body;
  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: 'abc', bodega_id: norte.id, cantidad: 1 }] });
  assert.equal(res.status, 400);
  assert.equal(await existencia(resma.id, norte.id), 10);
});

test('un despacho con existencia insuficiente responde 400 y no persiste nada', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  await entrada(resma.id, sur.id, 1);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 8 }])).body;
  const item = pedido.items[0];
  // El primer despacho es válido, el segundo no: todo debe revertirse.
  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`).send({
    despachos: [
      { item_pedido_id: item.id, bodega_id: norte.id, cantidad: 3 },
      { item_pedido_id: item.id, bodega_id: sur.id, cantidad: 5 }
    ]
  });
  assert.equal(res.status, 400);
  assert.equal(await existencia(resma.id, norte.id), 10);
  const recargado = (await request(app).get('/api/pedidos')).body[0];
  assert.equal(recargado.estado, 'PENDIENTE');
  assert.equal(recargado.items[0].cantidad_despachada, 0);
});

test('despachar a una bodega inexistente responde 404 y no toca existencias', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 5 }])).body;
  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: pedido.items[0].id, bodega_id: 9999, cantidad: 1 }] });
  assert.equal(res.status, 404);
  assert.equal(await existencia(resma.id, norte.id), 10);
});

test('D-04: cancelar solo desde PENDIENTE o PARCIALMENTE_DESPACHADO y sin tocar existencias', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);
  const pedido = (await crear([{ producto_id: resma.id, cantidad_solicitada: 4 }])).body;
  const item = pedido.items[0];
  await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: item.id, bodega_id: norte.id, cantidad: 1 }] });

  const cancelado = await request(app).post(`/api/pedidos/${pedido.id}/cancelar`);
  assert.equal(cancelado.status, 200);
  assert.equal(cancelado.body.estado, 'CANCELADO');
  assert.equal(await existencia(resma.id, norte.id), 9, 'lo ya despachado no vuelve');

  const otraVez = await request(app).post(`/api/pedidos/${pedido.id}/cancelar`);
  assert.equal(otraVez.status, 400);
  const despacharCancelado = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: item.id, bodega_id: norte.id, cantidad: 1 }] });
  assert.equal(despacharCancelado.status, 400);
  assert.equal((await request(app).post('/api/pedidos/9999/cancelar')).status, 404);
});

test('un id de pedido no numérico responde 400, no 500', async () => {
  assert.equal((await request(app).post('/api/pedidos/abc/cancelar')).status, 400);
  assert.equal((await request(app).post('/api/pedidos/abc/despachar').send({ despachos: [] })).status, 400);
});

test('crear pedido con bodega_id en ítem guarda la asociación y la incluye al listar', async () => {
  const { resma } = cat.productos;
  const { sur } = cat.bodegas;
  const res = await request(app).post('/api/pedidos').send({
    descripcion: 'Pedido con bodega específica',
    items: [{ producto_id: resma.id, bodega_id: sur.id, cantidad_solicitada: 15 }]
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.items[0].bodega_id, sur.id);
  assert.equal(res.body.items[0].bodega?.nombre, 'Sur');
});
