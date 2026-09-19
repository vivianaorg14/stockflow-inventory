// src/servicios/pedidos.js
// Dueño del ciclo de vida del pedido (R2; ADR-005, ADR-006, ADR-007).

const { Pedido, ItemPedido, Producto, Movimiento, sequelize } = require('../models');
const { ErrorDeNegocio, NoEncontrado } = require('./errores');
const { validarCantidad, validarId } = require('./validaciones');
const { ajustarExistencia, exigirBodega } = require('./inventario');

const INCLUIR_ITEMS = [{
  model: ItemPedido, as: 'items',
  include: [{ model: Producto, as: 'producto', attributes: ['sku', 'nombre'] }]
}];

const ESTADOS_ABIERTOS = ['PENDIENTE', 'PARCIALMENTE_DESPACHADO'];

function listarPedidos() {
  return Pedido.findAll({ include: INCLUIR_ITEMS, order: [['createdAt', 'DESC']] });
}

async function obtenerPedido(pedido_id, transaccion) {
  const pedido = await Pedido.findByPk(pedido_id, { include: [{ model: ItemPedido, as: 'items' }], transaction: transaccion });
  if (!pedido) throw new NoEncontrado(`Pedido ${pedido_id} no encontrado`);
  return pedido;
}

function exigirAbierto(pedido) {
  if (!ESTADOS_ABIERTOS.includes(pedido.estado)) {
    throw new ErrorDeNegocio(`No se puede operar un pedido en estado ${pedido.estado}`);
  }
}

// Valida todos los ítems ANTES de insertar nada (D-07).
async function validarItems(items, transaccion) {
  if (!Array.isArray(items) || items.length === 0) throw new ErrorDeNegocio('El pedido debe tener al menos un ítem');
  const validados = [];
  for (const item of items) {
    if (!item.producto_id) throw new ErrorDeNegocio('Cada ítem debe tener producto_id');
    const producto = await Producto.findByPk(item.producto_id, { transaction: transaccion });
    if (!producto) throw new NoEncontrado(`Producto ${item.producto_id} no encontrado`);
    validados.push({
      producto_id: producto.id,
      cantidad_solicitada: validarCantidad(item.cantidad_solicitada, 'cantidad_solicitada'),
      cantidad_despachada: 0
    });
  }
  return validados;
}

async function crearPedido({ descripcion, items }) {
  const id = await sequelize.transaction(async (transaccion) => {
    const validados = await validarItems(items, transaccion);
    const pedido = await Pedido.create({ descripcion, estado: 'PENDIENTE' }, { transaction: transaccion });
    await ItemPedido.bulkCreate(validados.map(i => ({ ...i, pedido_id: pedido.id })), { transaction: transaccion });
    return pedido.id;
  });
  return Pedido.findByPk(id, { include: INCLUIR_ITEMS });
}

function calcularEstado(items) {
  if (items.every(i => i.cantidad_despachada >= i.cantidad_solicitada)) return 'COMPLETADO';
  if (items.some(i => i.cantidad_despachada > 0)) return 'PARCIALMENTE_DESPACHADO';
  return 'PENDIENTE';
}

async function aplicarDespacho(pedido, despacho, transaccion) {
  const { bodega_id } = despacho;
  if (!despacho.item_pedido_id || !bodega_id) throw new ErrorDeNegocio('Cada despacho requiere item_pedido_id, bodega_id y cantidad');
  const item_pedido_id = validarId(despacho.item_pedido_id, 'item_pedido_id');
  const cantidad = validarCantidad(despacho.cantidad, 'cantidad');

  const item = pedido.items.find(i => i.id === item_pedido_id);
  if (!item) throw new NoEncontrado(`Ítem ${item_pedido_id} no pertenece a este pedido`);

  const pendiente = item.cantidad_solicitada - item.cantidad_despachada;
  if (cantidad > pendiente) {
    throw new ErrorDeNegocio(`No se puede despachar ${cantidad} unidades del ítem ${item_pedido_id}. Pendiente: ${pendiente}`);
  }

  await exigirBodega(bodega_id, transaccion);
  await ajustarExistencia(item.producto_id, bodega_id, -cantidad, transaccion);
  await item.update({ cantidad_despachada: item.cantidad_despachada + cantidad }, { transaction: transaccion });
  await Movimiento.create({
    tipo: 'SALIDA', producto_id: item.producto_id, bodega_origen_id: bodega_id, cantidad,
    notas: `Despacho pedido #${pedido.id}`
  }, { transaction: transaccion });
}

// El inventario se descuenta AQUÍ (ADR-005); la asignación de bodegas es manual (ADR-006).
async function despachar(pedido_id, despachos) {
  if (!Array.isArray(despachos) || despachos.length === 0) {
    throw new ErrorDeNegocio('Debes indicar al menos un despacho con item_pedido_id, bodega_id y cantidad');
  }
  const estado = await sequelize.transaction(async (transaccion) => {
    const pedido = await obtenerPedido(pedido_id, transaccion);
    exigirAbierto(pedido);
    for (const despacho of despachos) await aplicarDespacho(pedido, despacho, transaccion);
    await pedido.reload({ include: [{ model: ItemPedido, as: 'items' }], transaction: transaccion });
    const nuevoEstado = calcularEstado(pedido.items);
    await pedido.update({ estado: nuevoEstado }, { transaction: transaccion });
    return nuevoEstado;
  });
  return { estado, pedido: await Pedido.findByPk(pedido_id, { include: INCLUIR_ITEMS }) };
}

// Cancelar no devuelve unidades: lo despachado ya salió y está en la historia (ADR-007).
async function cancelar(pedido_id) {
  await sequelize.transaction(async (transaccion) => {
    const pedido = await obtenerPedido(pedido_id, transaccion);
    exigirAbierto(pedido);
    await pedido.update({ estado: 'CANCELADO' }, { transaction: transaccion });
  });
  return Pedido.findByPk(pedido_id, { include: INCLUIR_ITEMS });
}

module.exports = { crearPedido, listarPedidos, despachar, cancelar };
