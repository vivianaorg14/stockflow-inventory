// Caracteriza R1, R2 y R4 del enunciado (docs/08-enunciado.md) tal como se cumplen hoy.
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase, entrada, existencia, tokenSupervisorMenor, tokenMenorSetup } = require('./apoyo');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

test('R1: un traslado descuenta en origen y suma en destino', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 100);

  const res = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(norte.id)}`)
    .send({
      tipo: 'TRASLADO', producto_id: resma.id, bodega_origen_id: norte.id, bodega_destino_id: sur.id, cantidad: 30
    });

  assert.equal(res.status, 201);
  assert.equal(await existencia(resma.id, norte.id), 70);
  assert.equal(await existencia(resma.id, sur.id), 30);
});

test('R1: un traslado que dejaría negativo se rechaza sin tocar saldos ni historia', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 5);
  const antes = (await request(app).get('/api/movimientos')).body.length;

  const res = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(norte.id)}`)
    .send({
      tipo: 'TRASLADO', producto_id: resma.id, bodega_origen_id: norte.id, bodega_destino_id: sur.id, cantidad: 99
    });

  assert.equal(res.status, 400); // antes: >= 400 (caracterización de D-05)
  assert.match(res.body.error, /insuficiente/);
  assert.equal(await existencia(resma.id, norte.id), 5);
  assert.equal(await existencia(resma.id, sur.id), 0);
  assert.equal((await request(app).get('/api/movimientos')).body.length, antes);
});

test('R1: origen y destino no pueden ser la misma bodega', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  const res = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(norte.id)}`)
    .send({
      tipo: 'TRASLADO', producto_id: resma.id, bodega_origen_id: norte.id, bodega_destino_id: norte.id, cantidad: 1
    });
  assert.equal(res.status, 400);
});

test('R4: un producto descontinuado no admite entradas pero sí salidas', async () => {
  const { teclado } = cat.productos; const { norte } = cat.bodegas;

  const entradaRechazada = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(norte.id)}`)
    .send({ tipo: 'ENTRADA', producto_id: teclado.id, bodega_destino_id: norte.id, cantidad: 1 });
  assert.equal(entradaRechazada.status, 400);
  assert.match(entradaRechazada.body.error, /DESCONTINUADO/);

  // Para probar la salida hace falta stock: se crea con un producto activo y luego se descontinúa.
  const res = await request(app).post('/api/productos')
    .set('Authorization', `Bearer ${tokenMenorSetup()}`)
    .send({ sku: 'X-1', nombre: 'Temporal' });
  await entrada(res.body.id, norte.id, 3);
  await request(app).patch(`/api/productos/${res.body.id}/descontinuar`);

  const salida = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(norte.id)}`)
    .send({ tipo: 'SALIDA', producto_id: res.body.id, bodega_origen_id: norte.id, cantidad: 2 });
  assert.equal(salida.status, 201);
  assert.equal(await existencia(res.body.id, norte.id), 1);
});

test('R2: un pedido se despacha desde varias bodegas y queda COMPLETADO', async () => {
  const { resma } = cat.productos; const { norte, sur } = cat.bodegas;
  await entrada(resma.id, norte.id, 60);
  await entrada(resma.id, sur.id, 60);

  const pedido = (await request(app).post('/api/pedidos')
    .send({ descripcion: 'p', items: [{ producto_id: resma.id, cantidad_solicitada: 100 }] })).body;
  const item = pedido.items[0];

  const res = await request(app).post(`/api/pedidos/${pedido.id}/despachar`).send({
    despachos: [
      { item_pedido_id: item.id, bodega_id: norte.id, cantidad: 50 },
      { item_pedido_id: item.id, bodega_id: sur.id, cantidad: 50 }
    ]
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.pedido.estado, 'COMPLETADO');
  assert.equal(await existencia(resma.id, norte.id), 10);
  assert.equal(await existencia(resma.id, sur.id), 10);

  const salidas = (await request(app).get('/api/movimientos')).body
    .filter(m => m.tipo === 'SALIDA' && m.notas === `Despacho pedido #${pedido.id}`);
  assert.equal(salidas.length, 2);
});

test('R2: despacho parcial deja el pedido PARCIALMENTE_DESPACHADO y no supera lo pendiente', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 500);
  const pedido = (await request(app).post('/api/pedidos')
    .send({ items: [{ producto_id: resma.id, cantidad_solicitada: 10 }] })).body;
  const item = pedido.items[0];

  const parcial = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: item.id, bodega_id: norte.id, cantidad: 4 }] });
  assert.equal(parcial.body.pedido.estado, 'PARCIALMENTE_DESPACHADO');

  const excesivo = await request(app).post(`/api/pedidos/${pedido.id}/despachar`)
    .send({ despachos: [{ item_pedido_id: item.id, bodega_id: norte.id, cantidad: 7 }] });
  assert.equal(excesivo.status, 400);
  assert.match(excesivo.body.error, /Pendiente: 6/);
});
