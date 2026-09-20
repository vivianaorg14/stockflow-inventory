// src/servicios/pedidos.js
// Dueño del ciclo de vida del pedido (R2; ADR-005, ADR-006, ADR-007).

const { Pedido, ItemPedido, Producto, Bodega, ExistenciaPorBodega, Movimiento, sequelize } = require('../models');
const { ErrorDeNegocio, NoEncontrado } = require('./errores');
const { validarCantidad, validarId } = require('./validaciones');
const { ajustarExistencia, exigirBodega } = require('./inventario');

const INCLUIR_ITEMS = [{
  model: ItemPedido, as: 'items',
  include: [
    { model: Producto, as: 'producto', attributes: ['sku', 'nombre'] },
    { model: Bodega, as: 'bodega', attributes: ['id', 'nombre'] }
  ]
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

    let bodega_id = null;
    if (item.bodega_id) {
      bodega_id = Number(item.bodega_id);
      const bodegaExiste = await Bodega.findByPk(bodega_id, { transaction: transaccion });
      if (!bodegaExiste) throw new NoEncontrado(`Bodega ${bodega_id} no encontrada`);
    }

    validados.push({
      producto_id: producto.id,
      bodega_id,
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

// Balanceo preventivo sugerido (ADR-015):
// Calcula una propuesta de reparto multibodega sin modificar la base de datos.
// Prioriza bodegas con excedente disponible sobre su stock mínimo para evitar desabastecimiento.
async function sugerirReparto(pedido_id) {
  const pedido = await Pedido.findByPk(pedido_id, { include: INCLUIR_ITEMS });
  if (!pedido) throw new NoEncontrado(`Pedido ${pedido_id} no encontrado`);
  exigirAbierto(pedido);

  const bodegas = await Bodega.findAll({ order: [['nombre', 'ASC']] });
  const propuesta_despacho = [];
  const advertencias = [];

  for (const item of pedido.items) {
    let pendiente = item.cantidad_solicitada - item.cantidad_despachada;
    if (pendiente <= 0) continue;

    // Obtener existencias actuales de este producto en todas las bodegas
    const existencias = await Promise.all(
      bodegas.map(async (bodega) => {
        const fila = await ExistenciaPorBodega.findOne({
          where: { producto_id: item.producto_id, bodega_id: bodega.id }
        });
        const cantidad_actual = fila ? fila.cantidad_actual : 0;
        const minimo = fila ? fila.minimo : 0;
        const excedente = Math.max(0, cantidad_actual - minimo);
        return {
          bodega_id: bodega.id,
          bodega_nombre: bodega.nombre,
          cantidad_actual,
          minimo,
          excedente,
          asignado: 0
        };
      })
    );

    // Fase 1: Asignar del excedente seguro (por encima del mínimo)
    // Ordenamos por mayor excedente primero
    existencias.sort((a, b) => b.excedente - a.excedente);

    for (const b of existencias) {
      if (pendiente <= 0) break;
      if (b.excedente > 0) {
        const aSacar = Math.min(pendiente, b.excedente);
        b.asignado += aSacar;
        b.excedente -= aSacar;
        pendiente -= aSacar;
      }
    }

    // Fase 2: Si aún queda pendiente, tomar del stock disponible restante (riesgo de quedar bajo mínimo)
    if (pendiente > 0) {
      // Ordenamos por stock disponible remanente
      existencias.sort((a, b) => (b.cantidad_actual - b.asignado) - (a.cantidad_actual - a.asignado));

      for (const b of existencias) {
        if (pendiente <= 0) break;
        const disponibleRemanente = b.cantidad_actual - b.asignado;
        if (disponibleRemanente > 0) {
          const aSacar = Math.min(pendiente, disponibleRemanente);
          b.asignado += aSacar;
          pendiente -= aSacar;
          advertencias.push(
            `Para el ítem #${item.id} (${item.producto ? item.producto.nombre : item.producto_id}), ${b.bodega_nombre} quedará con ${b.cantidad_actual - b.asignado} unidades (bajo su mínimo de ${b.minimo})`
          );
        }
      }
    }

    // Si aún no se cubrió todo
    if (pendiente > 0) {
      advertencias.push(
        `Existencia total insuficiente en toda la red: faltan ${pendiente} unidades para cubrir el ítem #${item.id}`
      );
    }

    // Consolidar asignaciones
    for (const b of existencias) {
      if (b.asignado > 0) {
        const stockResultante = b.cantidad_actual - b.asignado;
        propuesta_despacho.push({
          item_pedido_id: item.id,
          producto_id: item.producto_id,
          producto: item.producto ? item.producto.nombre : undefined,
          bodega_id: b.bodega_id,
          bodega: b.bodega_nombre,
          cantidad: b.asignado,
          stock_actual: b.cantidad_actual,
          minimo: b.minimo,
          stock_resultante: stockResultante,
          queda_bajo_minimo: stockResultante < b.minimo
        });
      }
    }
  }

  return {
    pedido_id: pedido.id,
    descripcion: pedido.descripcion,
    criterio: 'Balanceo preventivo: prioriza despachar del excedente sobre el stock mínimo en cada bodega para evitar desabastecimiento.',
    propuesta_despacho,
    advertencias
  };
}

module.exports = { crearPedido, listarPedidos, despachar, cancelar, sugerirReparto };
