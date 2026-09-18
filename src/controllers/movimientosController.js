// src/controllers/movimientosController.js
// Lógica de negocio para registrar movimientos de inventario.
//
// REGLAS IMPLEMENTADAS:
// 1. Un movimiento confirmado es INMUTABLE (ADR-003): solo se puede crear, no editar ni eliminar.
// 2. Un producto DESCONTINUADO no puede recibir ENTRADAS.
// 3. Una SALIDA o TRASLADO no puede dejar existencia negativa.
// 4. Un TRASLADO descuenta origen y suma destino en una sola operación (transacción).
// 5. Las cantidades deben ser enteros positivos (AS-007).

const { Movimiento, Producto, Bodega, ExistenciaPorBodega, sequelize } = require('../models');

// GET /movimientos — devuelve el historial completo de movimientos
const listar = async (req, res) => {
  try {
    const movimientos = await Movimiento.findAll({
      include: [
        { model: Producto, as: 'producto', attributes: ['sku', 'nombre'] },
        { model: Bodega, as: 'bodegaOrigen', attributes: ['nombre'] },
        { model: Bodega, as: 'bodegaDestino', attributes: ['nombre'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /movimientos — registra un nuevo movimiento
// Body esperado: { tipo, producto_id, bodega_origen_id?, bodega_destino_id?, cantidad, notas? }
const registrar = async (req, res) => {
  // Usamos una transacción para que el movimiento y el ajuste de existencia
  // sean atómicos: si algo falla, se revierten ambos cambios.
  const transaccion = await sequelize.transaction();

  try {
    const { tipo, producto_id, bodega_origen_id, bodega_destino_id, cantidad, notas } = req.body;

    // --- Validaciones generales ---
    if (!tipo || !producto_id || !cantidad) {
      await transaccion.rollback();
      return res.status(400).json({ error: 'tipo, producto_id y cantidad son obligatorios' });
    }

    if (!['ENTRADA', 'SALIDA', 'TRASLADO'].includes(tipo)) {
      await transaccion.rollback();
      return res.status(400).json({ error: 'tipo debe ser ENTRADA, SALIDA o TRASLADO' });
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      await transaccion.rollback();
      return res.status(400).json({ error: 'La cantidad debe ser un entero positivo (AS-007)' });
    }

    // --- Validar que el producto existe ---
    const producto = await Producto.findByPk(producto_id, { transaction: transaccion });
    if (!producto) {
      await transaccion.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // --- Regla: producto DESCONTINUADO no admite ENTRADAS ---
    if (producto.estado === 'DESCONTINUADO' && tipo === 'ENTRADA') {
      await transaccion.rollback();
      return res.status(400).json({
        error: `El producto "${producto.nombre}" está DESCONTINUADO y no admite nuevas entradas`
      });
    }

    // --- Validaciones según tipo ---
    if (tipo === 'ENTRADA') {
      if (!bodega_destino_id) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'Una ENTRADA requiere bodega_destino_id' });
      }
      await ajustarExistencia(producto_id, bodega_destino_id, +cantidad, transaccion);
    }

    if (tipo === 'SALIDA') {
      if (!bodega_origen_id) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'Una SALIDA requiere bodega_origen_id' });
      }
      await ajustarExistencia(producto_id, bodega_origen_id, -cantidad, transaccion);
    }

    if (tipo === 'TRASLADO') {
      if (!bodega_origen_id || !bodega_destino_id) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'Un TRASLADO requiere bodega_origen_id y bodega_destino_id' });
      }
      if (bodega_origen_id === bodega_destino_id) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'La bodega de origen y destino no pueden ser la misma' });
      }
      // Primero descuenta origen (valida que no quede negativo), luego suma destino
      await ajustarExistencia(producto_id, bodega_origen_id, -cantidad, transaccion);
      await ajustarExistencia(producto_id, bodega_destino_id, +cantidad, transaccion);
    }

    // --- Crear el movimiento (inmutable, solo INSERT) ---
    const movimiento = await Movimiento.create(
      { tipo, producto_id, bodega_origen_id, bodega_destino_id, cantidad, notas },
      { transaction: transaccion }
    );

    await transaccion.commit();
    res.status(201).json({ mensaje: 'Movimiento registrado correctamente', movimiento });

  } catch (error) {
    await transaccion.rollback();
    // Si el error es de existencia negativa, devolvemos 400; si no, 500
    const esNegativo = error.message.includes('negativa');
    res.status(esNegativo ? 400 : 500).json({ error: error.message });
  }
};

// --- Función auxiliar ---
// Busca o crea el registro de existencia y ajusta la cantidad.
// Si el ajuste dejaría existencia negativa, lanza un error (la transacción hará rollback).
async function ajustarExistencia(producto_id, bodega_id, delta, transaccion) {
  // findOrCreate: si no existe el registro, lo crea con cantidad 0
  const [existencia] = await ExistenciaPorBodega.findOrCreate({
    where: { producto_id, bodega_id },
    defaults: { cantidad_actual: 0, minimo: 0 },
    transaction: transaccion
  });

  const nuevaCantidad = existencia.cantidad_actual + delta;

  if (nuevaCantidad < 0) {
    throw new Error(
      `Existencia insuficiente en bodega ${bodega_id}: disponible ${existencia.cantidad_actual}, requerido ${Math.abs(delta)}`
    );
  }

  await existencia.update({ cantidad_actual: nuevaCantidad }, { transaction: transaccion });
}

module.exports = { listar, registrar };
