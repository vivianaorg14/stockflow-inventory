// src/controllers/inventarioController.js
// CONSULTA OBLIGATORIA del enunciado:
// "Existencias por producto y bodega, señalando las que están por debajo del mínimo."
//
// También incluye el controlador de pedidos y despachos.

const { ExistenciaPorBodega, Producto, Bodega, Pedido, ItemPedido, Movimiento, sequelize } = require('../models');

// GET /inventario/existencias
// Devuelve todas las combinaciones producto × bodega con indicador bajo_minimo.
const existencias = async (req, res) => {
  try {
    const registros = await ExistenciaPorBodega.findAll({
      include: [
        { model: Producto, as: 'producto', attributes: ['sku', 'nombre', 'estado'] },
        { model: Bodega, as: 'bodega', attributes: ['nombre', 'ubicacion'] }
      ],
      order: [
        [{ model: Producto, as: 'producto' }, 'nombre', 'ASC'],
        [{ model: Bodega, as: 'bodega' }, 'nombre', 'ASC']
      ]
    });

    // Construimos la respuesta agregando el campo bajo_minimo calculado
    const resultado = registros.map(r => ({
      producto: r.producto.nombre,
      sku: r.producto.sku,
      estado_producto: r.producto.estado,
      bodega: r.bodega.nombre,
      ubicacion: r.bodega.ubicacion,
      cantidad_actual: r.cantidad_actual,
      minimo: r.minimo,
      bajo_minimo: r.cantidad_actual < r.minimo // ← indicador de alerta
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /pedidos — crear un pedido con sus ítems
// Body: { descripcion?, items: [{ producto_id, cantidad_solicitada }] }
const crearPedido = async (req, res) => {
  try {
    const { descripcion, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un ítem' });
    }

    // Crear el pedido
    const pedido = await Pedido.create({ descripcion, estado: 'PENDIENTE' });

    // Crear los ítems asociados
    for (const item of items) {
      if (!item.producto_id || !item.cantidad_solicitada || item.cantidad_solicitada <= 0) {
        return res.status(400).json({ error: 'Cada ítem debe tener producto_id y cantidad_solicitada mayor a 0' });
      }
      await ItemPedido.create({
        pedido_id: pedido.id,
        producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad_solicitada,
        cantidad_despachada: 0
      });
    }

    // Devolvemos el pedido con sus ítems
    const pedidoCompleto = await Pedido.findByPk(pedido.id, {
      include: [{ model: ItemPedido, as: 'items', include: [{ model: Producto, as: 'producto', attributes: ['sku', 'nombre'] }] }]
    });

    res.status(201).json(pedidoCompleto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /pedidos — listar todos los pedidos
const listarPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [{
        model: ItemPedido, as: 'items',
        include: [{ model: Producto, as: 'producto', attributes: ['sku', 'nombre'] }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /pedidos/:id/despachar — confirmar un despacho (descuenta inventario)
// Body: { despachos: [{ item_pedido_id, bodega_id, cantidad }] }
// Regla (AS-002): el inventario se descuenta AQUÍ, no al crear el pedido.
// Regla (AS-003): el usuario asigna manualmente qué cantidad sale de qué bodega.
// Regla (AS-004): se permiten despachos parciales.
const despacharPedido = async (req, res) => {
  const transaccion = await sequelize.transaction();

  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [{ model: ItemPedido, as: 'items' }],
      transaction: transaccion
    });

    if (!pedido) {
      await transaccion.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (pedido.estado === 'COMPLETADO' || pedido.estado === 'CANCELADO') {
      await transaccion.rollback();
      return res.status(400).json({ error: `No se puede despachar un pedido en estado ${pedido.estado}` });
    }

    const { despachos } = req.body;
    if (!despachos || despachos.length === 0) {
      await transaccion.rollback();
      return res.status(400).json({ error: 'Debes indicar al menos un despacho con item_pedido_id, bodega_id y cantidad' });
    }

    // Procesar cada despacho
    for (const despacho of despachos) {
      const { item_pedido_id, bodega_id, cantidad } = despacho;

      if (!item_pedido_id || !bodega_id || !cantidad || cantidad <= 0) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'Cada despacho requiere item_pedido_id, bodega_id y cantidad mayor a 0' });
      }

      // Buscar el ítem dentro del pedido
      const item = pedido.items.find(i => i.id === item_pedido_id);
      if (!item) {
        await transaccion.rollback();
        return res.status(404).json({ error: `Ítem ${item_pedido_id} no pertenece a este pedido` });
      }

      // Validar que no se despache más de lo pendiente
      const pendiente = item.cantidad_solicitada - item.cantidad_despachada;
      if (cantidad > pendiente) {
        await transaccion.rollback();
        return res.status(400).json({
          error: `No se puede despachar ${cantidad} unidades del ítem ${item_pedido_id}. Pendiente: ${pendiente}`
        });
      }

      // Verificar existencia disponible en la bodega
      const existencia = await ExistenciaPorBodega.findOne({
        where: { producto_id: item.producto_id, bodega_id },
        transaction: transaccion
      });

      if (!existencia || existencia.cantidad_actual < cantidad) {
        await transaccion.rollback();
        const disponible = existencia ? existencia.cantidad_actual : 0;
        return res.status(400).json({
          error: `Existencia insuficiente en bodega ${bodega_id}: disponible ${disponible}, requerido ${cantidad}`
        });
      }

      // Descontar existencia
      await existencia.update(
        { cantidad_actual: existencia.cantidad_actual - cantidad },
        { transaction: transaccion }
      );

      // Actualizar cantidad despachada del ítem
      await item.update(
        { cantidad_despachada: item.cantidad_despachada + cantidad },
        { transaction: transaccion }
      );

      // Registrar movimiento de SALIDA (trazabilidad)
      await Movimiento.create({
        tipo: 'SALIDA',
        producto_id: item.producto_id,
        bodega_origen_id: bodega_id,
        cantidad,
        notas: `Despacho pedido #${pedido.id}`
      }, { transaction: transaccion });
    }

    // Recargar ítems actualizados para calcular nuevo estado del pedido
    await pedido.reload({ include: [{ model: ItemPedido, as: 'items' }], transaction: transaccion });

    const todosCompletos = pedido.items.every(i => i.cantidad_despachada >= i.cantidad_solicitada);
    const algunoDespachado = pedido.items.some(i => i.cantidad_despachada > 0);

    const nuevoEstado = todosCompletos
      ? 'COMPLETADO'
      : algunoDespachado
        ? 'PARCIALMENTE_DESPACHADO'
        : 'PENDIENTE';

    await pedido.update({ estado: nuevoEstado }, { transaction: transaccion });
    await transaccion.commit();

    res.json({ mensaje: `Pedido ${nuevoEstado}`, pedido: await Pedido.findByPk(pedido.id, { include: [{ model: ItemPedido, as: 'items' }] }) });

  } catch (error) {
    await transaccion.rollback();
    res.status(500).json({ error: error.message });
  }
};

module.exports = { existencias, crearPedido, listarPedidos, despacharPedido };
