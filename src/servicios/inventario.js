// src/servicios/inventario.js
// Dueño de las reglas de existencias y movimientos (R1, R3, R4; ADR-003, ADR-009, ADR-014).

const { Movimiento, Producto, Bodega, ExistenciaPorBodega, sequelize } = require('../models');
const { ErrorDeNegocio, NoEncontrado } = require('./errores');
const { validarCantidad, validarEnteroNoNegativo } = require('./validaciones');

const TIPOS = ['ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE'];
const SENTIDOS = ['ENTRADA', 'SALIDA'];

const INCLUIR_RELACIONES = [
  { model: Producto, as: 'producto', attributes: ['sku', 'nombre'] },
  { model: Bodega, as: 'bodegaOrigen', attributes: ['nombre'] },
  { model: Bodega, as: 'bodegaDestino', attributes: ['nombre'] }
];

function listarMovimientos() {
  return Movimiento.findAll({ include: INCLUIR_RELACIONES, order: [['createdAt', 'DESC']] });
}

async function obtenerProducto(producto_id, transaccion) {
  const producto = await Producto.findByPk(producto_id, { transaction: transaccion });
  if (!producto) throw new NoEncontrado(`Producto ${producto_id} no encontrado`);
  return producto;
}

async function exigirBodega(bodega_id, transaccion) {
  const bodega = await Bodega.findByPk(bodega_id, { transaction: transaccion });
  if (!bodega) throw new NoEncontrado(`Bodega ${bodega_id} no encontrada`);
}

// Ajusta cantidad_actual del par producto-bodega. Crea la fila si no existe.
// Lanza ErrorDeNegocio si el resultado quedaría negativo (R1).
async function ajustarExistencia(producto_id, bodega_id, delta, transaccion) {
  const [fila] = await ExistenciaPorBodega.findOrCreate({
    where: { producto_id, bodega_id },
    defaults: { cantidad_actual: 0, minimo: 0 },
    transaction: transaccion
  });
  const nuevaCantidad = fila.cantidad_actual + delta;
  if (nuevaCantidad < 0) {
    throw new ErrorDeNegocio(
      `Existencia insuficiente en bodega ${bodega_id}: disponible ${fila.cantidad_actual}, requerido ${Math.abs(delta)}`
    );
  }
  await fila.update({ cantidad_actual: nuevaCantidad }, { transaction: transaccion });
  return fila;
}

// Normaliza el AJUSTE a un movimiento de una sola bodega con signo.
function resolverEfecto({ tipo, sentido, bodega_origen_id, bodega_destino_id, notas }) {
  if (tipo === 'ENTRADA') {
    if (!bodega_destino_id) throw new ErrorDeNegocio('Una ENTRADA requiere bodega_destino_id');
    return { esEntrada: true, sentido: null, origen: null, destino: bodega_destino_id };
  }
  if (tipo === 'SALIDA') {
    if (!bodega_origen_id) throw new ErrorDeNegocio('Una SALIDA requiere bodega_origen_id');
    return { esEntrada: false, sentido: null, origen: bodega_origen_id, destino: null };
  }
  if (tipo === 'TRASLADO') {
    if (!bodega_origen_id || !bodega_destino_id) throw new ErrorDeNegocio('Un TRASLADO requiere bodega_origen_id y bodega_destino_id');
    if (Number(bodega_origen_id) === Number(bodega_destino_id)) throw new ErrorDeNegocio('La bodega de origen y destino no pueden ser la misma');
    return { esEntrada: false, sentido: null, origen: bodega_origen_id, destino: bodega_destino_id };
  }
  // AJUSTE (ADR-014)
  if (!SENTIDOS.includes(sentido)) throw new ErrorDeNegocio('Un AJUSTE requiere sentido ENTRADA o SALIDA');
  if (!notas || !String(notas).trim()) throw new ErrorDeNegocio('Un AJUSTE requiere notas con el motivo');
  if (sentido === 'ENTRADA') {
    if (!bodega_destino_id) throw new ErrorDeNegocio('Un AJUSTE de ENTRADA requiere bodega_destino_id');
    return { esEntrada: true, sentido, origen: null, destino: bodega_destino_id };
  }
  if (!bodega_origen_id) throw new ErrorDeNegocio('Un AJUSTE de SALIDA requiere bodega_origen_id');
  return { esEntrada: false, sentido, origen: bodega_origen_id, destino: null };
}

async function registrarMovimiento(datos) {
  const { tipo, producto_id, notas } = datos;
  if (!TIPOS.includes(tipo)) throw new ErrorDeNegocio(`tipo debe ser uno de ${TIPOS.join(', ')}`);
  if (!producto_id) throw new ErrorDeNegocio('producto_id es obligatorio');
  const cantidad = validarCantidad(datos.cantidad, 'cantidad');
  const efecto = resolverEfecto(datos);

  return sequelize.transaction(async (transaccion) => {
    const producto = await obtenerProducto(producto_id, transaccion);
    if (efecto.origen) await exigirBodega(efecto.origen, transaccion);
    if (efecto.destino) await exigirBodega(efecto.destino, transaccion);

    // R4: un descontinuado no recibe unidades nuevas, ni por compra ni por ajuste.
    if (producto.estado === 'DESCONTINUADO' && efecto.esEntrada) {
      throw new ErrorDeNegocio(`El producto "${producto.nombre}" está DESCONTINUADO y no admite nuevas entradas`);
    }

    if (efecto.origen) await ajustarExistencia(producto_id, efecto.origen, -cantidad, transaccion);
    if (efecto.destino) await ajustarExistencia(producto_id, efecto.destino, +cantidad, transaccion);

    return Movimiento.create({
      tipo, sentido: efecto.sentido, producto_id,
      bodega_origen_id: efecto.origen, bodega_destino_id: efecto.destino,
      cantidad, notas
    }, { transaction: transaccion });
  });
}

const INCLUIR_PRODUCTO_Y_BODEGA = [
  { model: Producto, as: 'producto', attributes: ['sku', 'nombre', 'estado'] },
  { model: Bodega, as: 'bodega', attributes: ['nombre', 'ubicacion'] }
];
const ORDEN_PRODUCTO_BODEGA = [
  [{ model: Producto, as: 'producto' }, 'nombre', 'ASC'],
  [{ model: Bodega, as: 'bodega' }, 'nombre', 'ASC']
];

// Consulta obligatoria del enunciado. bajo_minimo es estrictamente menor (ADR-004).
async function listarExistencias(filtroBodegaId = null) {
  const where = filtroBodegaId ? { bodega_id: filtroBodegaId } : {};
  const filas = await ExistenciaPorBodega.findAll({
    where,
    include: INCLUIR_PRODUCTO_Y_BODEGA,
    order: ORDEN_PRODUCTO_BODEGA
  });
  return filas.map(fila => ({
    producto_id: fila.producto_id,
    bodega_id: fila.bodega_id,
    producto: fila.producto.nombre,
    sku: fila.producto.sku,
    estado_producto: fila.producto.estado,
    bodega: fila.bodega.nombre,
    ubicacion: fila.bodega.ubicacion,
    cantidad_actual: fila.cantidad_actual,
    minimo: fila.minimo,
    bajo_minimo: fila.cantidad_actual < fila.minimo
  }));
}

async function fijarMinimo(producto_id, bodega_id, valor) {
  const minimo = validarEnteroNoNegativo(valor, 'minimo');
  return sequelize.transaction(async (transaccion) => {
    await obtenerProducto(producto_id, transaccion);
    await exigirBodega(bodega_id, transaccion);
    const [fila] = await ExistenciaPorBodega.findOrCreate({
      where: { producto_id, bodega_id },
      defaults: { cantidad_actual: 0, minimo },
      transaction: transaccion
    });
    if (fila.minimo !== minimo) await fila.update({ minimo }, { transaction: transaccion });
    return fila;
  });
}

// Signo con el que un movimiento afecta a una bodega concreta.
function efectoSobreBodega(movimiento, bodega_id) {
  let efecto = 0;
  if (movimiento.bodega_destino_id === bodega_id) efecto += movimiento.cantidad;
  if (movimiento.bodega_origen_id === bodega_id) efecto -= movimiento.cantidad;
  return efecto;
}

// R3: reconstruye el saldo de cada par producto-bodega sumando su historia
// y lo compara con el saldo materializado.
async function auditar() {
  const [existencias, movimientos] = await Promise.all([
    ExistenciaPorBodega.findAll({ include: INCLUIR_PRODUCTO_Y_BODEGA, order: ORDEN_PRODUCTO_BODEGA }),
    Movimiento.findAll({ attributes: ['producto_id', 'bodega_origen_id', 'bodega_destino_id', 'cantidad'] })
  ]);

  const filas = existencias.map(fila => {
    const saldo_historia = movimientos
      .filter(m => m.producto_id === fila.producto_id)
      .reduce((suma, m) => suma + efectoSobreBodega(m, fila.bodega_id), 0);
    return {
      producto: fila.producto.nombre,
      sku: fila.producto.sku,
      bodega: fila.bodega.nombre,
      saldo_materializado: fila.cantidad_actual,
      saldo_historia,
      cuadra: fila.cantidad_actual === saldo_historia
    };
  });

  return { total: filas.length, descuadradas: filas.filter(f => !f.cuadra).length, filas };
}

module.exports = { registrarMovimiento, listarMovimientos, ajustarExistencia, listarExistencias, fijarMinimo, auditar, exigirBodega };
