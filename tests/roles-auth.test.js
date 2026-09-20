// tests/roles-auth.test.js
// Pruebas para extensión de diseño: roles, autenticación JWT, límite de 3 bodegas y balanceo sugerido.

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const {
  app,
  request,
  prepararBase,
  crearCatalogoBase,
  entrada,
  tokenSupervisorMayor,
  tokenSupervisorMenor,
  hashPassword
} = require('./apoyo');
const { Usuario, Bodega } = require('../src/models');

before(async () => {
  await prepararBase();
});

test('Límite de 3 bodegas: rechaza crear una 4ª bodega con HTTP 400', async () => {
  await prepararBase();
  await request(app).post('/api/bodegas').send({ nombre: 'B1', ubicacion: 'U1' });
  await request(app).post('/api/bodegas').send({ nombre: 'B2', ubicacion: 'U2' });
  await request(app).post('/api/bodegas').send({ nombre: 'B3', ubicacion: 'U3' });

  // Intento de crear una cuarta bodega
  const res = await request(app).post('/api/bodegas').send({ nombre: 'B4', ubicacion: 'U4' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /solo admite 3 bodegas/i);
});

test('Modelo Usuario: no permite crear más de 1 supervisor_mayor', async () => {
  await prepararBase();
  await Usuario.create({
    nombre: 'Mayor 1',
    username: 'mayor1',
    password_hash: hashPassword('123'),
    rol: 'supervisor_mayor',
    bodega_id: null
  });

  await assert.rejects(
    Usuario.create({
      nombre: 'Mayor 2',
      username: 'mayor2',
      password_hash: hashPassword('123'),
      rol: 'supervisor_mayor',
      bodega_id: null
    }),
    /exactamente 1 supervisor_mayor/i
  );
});

test('Modelo Usuario: no permite asignar más de 1 supervisor_menor a la misma bodega', async () => {
  await prepararBase();
  const b = await Bodega.create({ nombre: 'Bodega Test', ubicacion: 'Test' });

  await Usuario.create({
    nombre: 'Menor 1',
    username: 'menor1',
    password_hash: hashPassword('123'),
    rol: 'supervisor_menor',
    bodega_id: b.id
  });

  await assert.rejects(
    Usuario.create({
      nombre: 'Menor 2',
      username: 'menor2',
      password_hash: hashPassword('123'),
      rol: 'supervisor_menor',
      bodega_id: b.id
    }),
    /Ya existe un supervisor_menor asignado a la bodega/i
  );
});

test('Autenticación: login exitoso devuelve JWT y perfil', async () => {
  await prepararBase();
  await Usuario.create({
    nombre: 'Carlos',
    username: 'carlos',
    password_hash: hashPassword('claveSecreta123'),
    rol: 'supervisor_mayor',
    bodega_id: null
  });

  // Login correcto
  const resOk = await request(app).post('/api/auth/login').send({
    username: 'carlos',
    password: 'claveSecreta123'
  });
  assert.equal(resOk.status, 200);
  assert.ok(resOk.body.token);
  assert.equal(resOk.body.usuario.username, 'carlos');
  assert.equal(resOk.body.usuario.rol, 'supervisor_mayor');

  // Consulta de perfil con el token
  const resPerfil = await request(app)
    .get('/api/auth/perfil')
    .set('Authorization', `Bearer ${resOk.body.token}`);
  assert.equal(resPerfil.status, 200);
  assert.equal(resPerfil.body.username, 'carlos');

  // Login con contraseña incorrecta
  const resFail = await request(app).post('/api/auth/login').send({
    username: 'carlos',
    password: 'passwordInvalida'
  });
  assert.equal(resFail.status, 401);
});

test('Permisos Pedidos: supervisor_menor no puede crear pedidos (HTTP 403)', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  const tokenMenor = tokenSupervisorMenor(bodegas.norte.id);

  const res = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${tokenMenor}`)
    .send({
      descripcion: 'Intento menor',
      items: [{ producto_id: productos.resma.id, cantidad_solicitada: 10 }]
    });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /solo el supervisor_mayor puede crear pedidos/i);
});

test('Permisos Pedidos: supervisor_mayor crea pedidos y despacha desde cualquier bodega', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  await entrada(productos.resma.id, bodegas.norte.id, 50);
  await entrada(productos.resma.id, bodegas.sur.id, 50);

  const tokenMayor = tokenSupervisorMayor();

  // Crear pedido
  const resPedido = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      descripcion: 'Pedido por mayor',
      items: [{ producto_id: productos.resma.id, cantidad_solicitada: 30 }]
    });
  assert.equal(resPedido.status, 201);
  const pedido = resPedido.body;
  const itemId = pedido.items[0].id;

  // Despacho repartido entre 2 bodegas por supervisor_mayor
  const resDespacho = await request(app)
    .post(`/api/pedidos/${pedido.id}/despachar`)
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      despachos: [
        { item_pedido_id: itemId, bodega_id: bodegas.norte.id, cantidad: 10 },
        { item_pedido_id: itemId, bodega_id: bodegas.sur.id, cantidad: 20 }
      ]
    });
  assert.equal(resDespacho.status, 200);
  assert.equal(resDespacho.body.pedido.estado, 'COMPLETADO');
});

test('Permisos Despacho: supervisor_menor solo puede despachar desde su propia bodega', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  await entrada(productos.resma.id, bodegas.norte.id, 50);
  await entrada(productos.resma.id, bodegas.sur.id, 50);

  const tokenMayor = tokenSupervisorMayor();
  const tokenMenorNorte = tokenSupervisorMenor(bodegas.norte.id);

  // Supervisor mayor crea el pedido
  const resPedido = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      descripcion: 'Pedido parcial',
      items: [{ producto_id: productos.resma.id, cantidad_solicitada: 40 }]
    });
  const pedido = resPedido.body;
  const itemId = pedido.items[0].id;

  // Supervisor Menor Norte intenta despachar desde Bodega Sur -> 403
  const resIntentoSur = await request(app)
    .post(`/api/pedidos/${pedido.id}/despachar`)
    .set('Authorization', `Bearer ${tokenMenorNorte}`)
    .send({
      despachos: [{ item_pedido_id: itemId, bodega_id: bodegas.sur.id, cantidad: 10 }]
    });
  assert.equal(resIntentoSur.status, 403);
  assert.match(resIntentoSur.body.error, /solo puede despachar desde su propia bodega/i);

  // Supervisor Menor Norte despacha desde Bodega Norte -> 200 OK
  const resDespachoNorte = await request(app)
    .post(`/api/pedidos/${pedido.id}/despachar`)
    .set('Authorization', `Bearer ${tokenMenorNorte}`)
    .send({
      despachos: [{ item_pedido_id: itemId, bodega_id: bodegas.norte.id, cantidad: 15 }]
    });
  assert.equal(resDespachoNorte.status, 200);
  assert.equal(resDespachoNorte.body.pedido.estado, 'PARCIALMENTE_DESPACHADO');
});

test('Permisos Inventario: supervisor_menor solo ve existencias de su propia bodega', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  await entrada(productos.resma.id, bodegas.norte.id, 20);
  await entrada(productos.resma.id, bodegas.sur.id, 30);
  await entrada(productos.resma.id, bodegas.central.id, 40);

  const tokenMenorNorte = tokenSupervisorMenor(bodegas.norte.id);
  const tokenMayor = tokenSupervisorMayor();

  // Supervisor Menor Norte consulta existencias
  const resMenor = await request(app)
    .get('/api/inventario/existencias')
    .set('Authorization', `Bearer ${tokenMenorNorte}`);
  assert.equal(resMenor.status, 200);
  // Todas las filas devueltas deben pertenecer a Bodega Norte
  assert.ok(resMenor.body.length > 0);
  assert.ok(resMenor.body.every(f => f.bodega_id === bodegas.norte.id));

  // Supervisor Mayor consulta existencias: ve las 3 bodegas
  const resMayor = await request(app)
    .get('/api/inventario/existencias')
    .set('Authorization', `Bearer ${tokenMayor}`);
  assert.equal(resMayor.status, 200);
  const bodegasEncontradas = new Set(resMayor.body.map(f => f.bodega_id));
  assert.ok(bodegasEncontradas.has(bodegas.norte.id));
  assert.ok(bodegasEncontradas.has(bodegas.sur.id));
  assert.ok(bodegasEncontradas.has(bodegas.central.id));
});

test('Permisos Movimientos: supervisor_menor no puede registrar movimientos en otra bodega', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  const tokenMenorNorte = tokenSupervisorMenor(bodegas.norte.id);

  // Intento de ENTRADA en Bodega Sur por supervisor de Bodega Norte -> 403
  const resEntradaAjena = await request(app)
    .post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenMenorNorte}`)
    .send({
      tipo: 'ENTRADA',
      producto_id: productos.resma.id,
      bodega_destino_id: bodegas.sur.id,
      cantidad: 10
    });
  assert.equal(resEntradaAjena.status, 403);
  assert.match(resEntradaAjena.body.error, /solo puede registrar movimientos en su propia bodega/i);

  // ENTRADA en su propia bodega (Norte) -> 201 OK
  const resEntradaPropia = await request(app)
    .post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenMenorNorte}`)
    .send({
      tipo: 'ENTRADA',
      producto_id: productos.resma.id,
      bodega_destino_id: bodegas.norte.id,
      cantidad: 10
    });
  assert.equal(resEntradaPropia.status, 201);
});

test('Balanceo sugerido: POST /api/pedidos/:id/sugerir-reparto propone distribución sin alterar BD', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();

  // Configuramos existencias y mínimos:
  // Bodega Norte: 50 unidades, mínimo 20 -> Excedente seguro: 30
  // Bodega Sur: 100 unidades, mínimo 40 -> Excedente seguro: 60
  // Bodega Central: 10 unidades, mínimo 15 -> Excedente seguro: 0
  await request(app).put(`/api/inventario/existencias/${productos.resma.id}/${bodegas.norte.id}/minimo`).send({ minimo: 20 });
  await request(app).put(`/api/inventario/existencias/${productos.resma.id}/${bodegas.sur.id}/minimo`).send({ minimo: 40 });
  await request(app).put(`/api/inventario/existencias/${productos.resma.id}/${bodegas.central.id}/minimo`).send({ minimo: 15 });

  await entrada(productos.resma.id, bodegas.norte.id, 50);
  await entrada(productos.resma.id, bodegas.sur.id, 100);
  await entrada(productos.resma.id, bodegas.central.id, 10);

  const tokenMayor = tokenSupervisorMayor();

  // Crear pedido de 70 resmas
  const resPedido = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      descripcion: 'Pedido balanceo prueba',
      items: [{ producto_id: productos.resma.id, cantidad_solicitada: 70 }]
    });
  const pedido = resPedido.body;

  // Consultar sugerencia de reparto
  const resSugerencia = await request(app)
    .post(`/api/pedidos/${pedido.id}/sugerir-reparto`)
    .set('Authorization', `Bearer ${tokenMayor}`);

  assert.equal(resSugerencia.status, 200);
  assert.ok(resSugerencia.body.criterio);
  assert.ok(Array.isArray(resSugerencia.body.propuesta_despacho));

  // La suma de las cantidades sugeridas debe ser exactamente 70
  const sumaPropuesta = resSugerencia.body.propuesta_despacho.reduce((sum, p) => sum + p.cantidad, 0);
  assert.equal(sumaPropuesta, 70);

  // Debe haber priorizado Bodega Sur (con mayor excedente: 60) y luego Bodega Norte (10)
  const despachoSur = resSugerencia.body.propuesta_despacho.find(p => p.bodega_id === bodegas.sur.id);
  const despachoNorte = resSugerencia.body.propuesta_despacho.find(p => p.bodega_id === bodegas.norte.id);
  assert.equal(despachoSur.cantidad, 60);
  assert.equal(despachoNorte.cantidad, 10);

  // Y NINGUNA debe haber quedado bajo mínimo en esta propuesta
  assert.ok(resSugerencia.body.propuesta_despacho.every(p => !p.queda_bajo_minimo));

  // Inmutabilidad: Verificar que NADA se haya modificado en la base de datos
  const { ExistenciaPorBodega: ExModel, Pedido: PedModel } = require('../src/models');
  const exSur = await ExModel.findOne({ where: { producto_id: productos.resma.id, bodega_id: bodegas.sur.id } });
  assert.equal(exSur.cantidad_actual, 100); // Sigue en 100 intacto

  const pedBD = await PedModel.findByPk(pedido.id);
  assert.equal(pedBD.estado, 'PENDIENTE'); // Sigue en PENDIENTE intacto
});

test('Restricciones supervisor_mayor: no puede registrar movimientos (HTTP 403)', async () => {
  await prepararBase();
  const { bodegas, productos } = await crearCatalogoBase();
  const tokenMayor = tokenSupervisorMayor();

  const res = await request(app)
    .post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      tipo: 'ENTRADA',
      producto_id: productos.resma.id,
      bodega_destino_id: bodegas.norte.id,
      cantidad: 10
    });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /supervisor_mayor solo puede consultar/i);
});

test('Restricciones supervisor_mayor: no puede crear productos (HTTP 403)', async () => {
  await prepararBase();
  const tokenMayor = tokenSupervisorMayor();

  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${tokenMayor}`)
    .send({
      sku: 'MAY-001',
      nombre: 'Producto no permitido'
    });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /supervisor_mayor no puede crear productos/i);
});
