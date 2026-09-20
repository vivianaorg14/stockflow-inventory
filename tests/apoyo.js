// tests/apoyo.js — utilidades compartidas por los tests.
// Fija la base en memoria ANTES de cargar cualquier módulo de la app.

process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const { sincronizar } = require('../src/models');

const prepararBase = () => sincronizar(true);

// Token para operaciones que requieren rol supervisor_menor (crear productos, movimientos)
const { generarToken, hashPassword } = require('../src/servicios/auth');

function tokenSupervisorMayor(id = 1) {
  return generarToken({ id, username: 'carlos.mayor', rol: 'supervisor_mayor', bodega_id: null });
}

function tokenSupervisorMenor(bodega_id, id = 2) {
  return generarToken({ id, username: `supervisor.b${bodega_id}`, rol: 'supervisor_menor', bodega_id });
}

// Token genérico de supervisor_menor para helpers de setup (bodega 1 por defecto)
const tokenMenorSetup = () => tokenSupervisorMenor(1, 99);

async function crearBodega(nombre) {
  // POST /bodegas no requiere rol específico; no enviamos restricción
  const res = await request(app).post('/api/bodegas').send({ nombre, ubicacion: nombre });
  if (res.status !== 201) throw new Error(`No se pudo crear bodega ${nombre}: ${res.text}`);
  return res.body;
}

async function crearProducto(sku, nombre) {
  // POST /productos solo permitido a supervisor_menor
  const res = await request(app).post('/api/productos')
    .set('Authorization', `Bearer ${tokenMenorSetup()}`)
    .send({ sku, nombre });
  if (res.status !== 201) throw new Error(`No se pudo crear producto ${sku}: ${res.text}`);
  return res.body;
}

// Catálogo mínimo para la mayoría de tests: 3 bodegas, 3 productos (uno descontinuado).
async function crearCatalogoBase() {
  const norte = await crearBodega('Norte');
  const sur = await crearBodega('Sur');
  const central = await crearBodega('Central');
  const resma = await crearProducto('PAP-001', 'Resma');
  const toner = await crearProducto('TON-002', 'Tóner');
  const teclado = await crearProducto('TEC-005', 'Teclado PS2');
  const res = await request(app).patch(`/api/productos/${teclado.id}/descontinuar`);
  if (res.status !== 200) throw new Error(`No se pudo descontinuar ${teclado.sku}: ${res.text}`);
  return { bodegas: { norte, sur, central }, productos: { resma, toner, teclado } };
}

// Entrada directa para dejar existencias en un estado conocido.
async function entrada(producto_id, bodega_id, cantidad) {
  // POST /movimientos solo permitido a supervisor_menor; usamos la bodega destino como contexto
  const res = await request(app).post('/api/movimientos')
    .set('Authorization', `Bearer ${tokenSupervisorMenor(bodega_id, 99)}`)
    .send({ tipo: 'ENTRADA', producto_id, bodega_destino_id: bodega_id, cantidad });
  if (res.status !== 201) throw new Error(`Entrada fallida: ${res.text}`);
  return res.body;
}

async function existencia(producto_id, bodega_id) {
  const { ExistenciaPorBodega } = require('../src/models');
  const fila = await ExistenciaPorBodega.findOne({ where: { producto_id, bodega_id } });
  return fila ? fila.cantidad_actual : 0;
}

module.exports = {
  app,
  request,
  prepararBase,
  crearCatalogoBase,
  crearProducto,
  crearBodega,
  entrada,
  existencia,
  tokenSupervisorMayor,
  tokenSupervisorMenor,
  tokenMenorSetup,
  hashPassword
};
