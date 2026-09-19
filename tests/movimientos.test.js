const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, prepararBase, crearCatalogoBase, entrada, existencia } = require('./apoyo');

let cat;
before(prepararBase);
beforeEach(async () => { await prepararBase(); cat = await crearCatalogoBase(); });

const mover = (cuerpo) => request(app).post('/api/movimientos').send(cuerpo);

test('D-05: existencia insuficiente responde 400, no 500', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 2);
  const res = await mover({ tipo: 'SALIDA', producto_id: resma.id, bodega_origen_id: norte.id, cantidad: 3 });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /insuficiente/);
});

test('producto o bodega inexistentes responden 404', async () => {
  const { norte } = cat.bodegas; const { resma } = cat.productos;
  assert.equal((await mover({ tipo: 'ENTRADA', producto_id: 9999, bodega_destino_id: norte.id, cantidad: 1 })).status, 404);
  assert.equal((await mover({ tipo: 'ENTRADA', producto_id: resma.id, bodega_destino_id: 9999, cantidad: 1 })).status, 404);
});

test('cantidad decimal o no positiva responde 400', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  for (const cantidad of [1.5, 0, -2, 'x']) {
    const res = await mover({ tipo: 'ENTRADA', producto_id: resma.id, bodega_destino_id: norte.id, cantidad });
    assert.equal(res.status, 400, `cantidad ${cantidad}`);
  }
});

test('AJUSTE con sentido ENTRADA suma; con sentido SALIDA resta y nunca deja negativo', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  await entrada(resma.id, norte.id, 10);

  const mas = await mover({ tipo: 'AJUSTE', sentido: 'ENTRADA', producto_id: resma.id, bodega_destino_id: norte.id, cantidad: 4, notas: 'conteo físico' });
  assert.equal(mas.status, 201);
  assert.equal(mas.body.movimiento.tipo, 'AJUSTE');
  assert.equal(await existencia(resma.id, norte.id), 14);

  const menos = await mover({ tipo: 'AJUSTE', sentido: 'SALIDA', producto_id: resma.id, bodega_origen_id: norte.id, cantidad: 5, notas: 'merma' });
  assert.equal(menos.status, 201);
  assert.equal(await existencia(resma.id, norte.id), 9);

  const negativo = await mover({ tipo: 'AJUSTE', sentido: 'SALIDA', producto_id: resma.id, bodega_origen_id: norte.id, cantidad: 50, notas: 'error' });
  assert.equal(negativo.status, 400);
  assert.equal(await existencia(resma.id, norte.id), 9);
});

test('AJUSTE exige notas y sentido válido', async () => {
  const { resma } = cat.productos; const { norte } = cat.bodegas;
  const sinNotas = await mover({ tipo: 'AJUSTE', sentido: 'ENTRADA', producto_id: resma.id, bodega_destino_id: norte.id, cantidad: 1 });
  assert.equal(sinNotas.status, 400);
  assert.match(sinNotas.body.error, /notas/);
  const sinSentido = await mover({ tipo: 'AJUSTE', producto_id: resma.id, bodega_destino_id: norte.id, cantidad: 1, notas: 'x' });
  assert.equal(sinSentido.status, 400);
  assert.match(sinSentido.body.error, /sentido/);
});

test('R4 también aplica al AJUSTE: sentido ENTRADA sobre descontinuado se rechaza', async () => {
  const { teclado } = cat.productos; const { norte } = cat.bodegas;
  const res = await mover({ tipo: 'AJUSTE', sentido: 'ENTRADA', producto_id: teclado.id, bodega_destino_id: norte.id, cantidad: 1, notas: 'x' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /DESCONTINUADO/);
});
