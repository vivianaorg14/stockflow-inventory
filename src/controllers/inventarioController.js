// src/controllers/inventarioController.js
// Consulta obligatoria, auditoría de R3 y mínimos. Reglas en src/servicios/inventario.js.

const { capturar } = require('./http');
const inventario = require('../servicios/inventario');
const { validarId } = require('../servicios/validaciones');

// GET /inventario/existencias — consulta obligatoria
const existencias = capturar(async (req, res) => {
  res.json(await inventario.listarExistencias());
});

// GET /inventario/auditoria — R3
const auditoria = capturar(async (req, res) => {
  res.json(await inventario.auditar());
});

// PUT /inventario/existencias/:producto_id/:bodega_id/minimo
const fijarMinimo = capturar(async (req, res) => {
  const producto_id = validarId(req.params.producto_id, 'producto_id');
  const bodega_id = validarId(req.params.bodega_id, 'bodega_id');
  const fila = await inventario.fijarMinimo(producto_id, bodega_id, req.body.minimo);
  res.json(fila);
});

module.exports = { existencias, auditoria, fijarMinimo };
