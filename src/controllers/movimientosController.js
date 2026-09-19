// src/controllers/movimientosController.js
// Traduce HTTP ↔ servicio de inventario. Las reglas viven en src/servicios/inventario.js.

const { capturar } = require('./http');
const inventario = require('../servicios/inventario');

const listar = capturar(async (req, res) => {
  res.json(await inventario.listarMovimientos());
});

const registrar = capturar(async (req, res) => {
  const movimiento = await inventario.registrarMovimiento(req.body);
  res.status(201).json({ mensaje: 'Movimiento registrado correctamente', movimiento });
});

module.exports = { listar, registrar };
