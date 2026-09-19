// src/controllers/inventarioController.js
// Consulta obligatoria, auditoría de R3 y mínimos. Reglas en src/servicios/inventario.js.

const { capturar } = require('./http');
const inventario = require('../servicios/inventario');
const { validarId } = require('../servicios/validaciones');

// GET /inventario/existencias — consulta obligatoria (filtrada para supervisor_menor)
const existencias = capturar(async (req, res) => {
  const bodegaId = (req.usuario && req.usuario.rol === 'supervisor_menor') ? req.usuario.bodega_id : null;
  res.json(await inventario.listarExistencias(bodegaId));
});

// GET /inventario/auditoria — R3 (reporte reservado a supervisor_mayor)
const auditoria = capturar(async (req, res) => {
  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    return res.status(403).json({ error: 'Acceso denegado: solo el supervisor_mayor puede ver reportes de auditoría' });
  }
  res.json(await inventario.auditar());
});

// PUT /inventario/existencias/:producto_id/:bodega_id/minimo
const fijarMinimo = capturar(async (req, res) => {
  const producto_id = validarId(req.params.producto_id, 'producto_id');
  const bodega_id = validarId(req.params.bodega_id, 'bodega_id');
  if (req.usuario && req.usuario.rol === 'supervisor_menor' && req.usuario.bodega_id !== bodega_id) {
    return res.status(403).json({
      error: `Acceso denegado: el supervisor_menor solo puede configurar su propia bodega (${req.usuario.bodega_id})`
    });
  }
  const fila = await inventario.fijarMinimo(producto_id, bodega_id, req.body.minimo);
  res.json(fila);
});

module.exports = { existencias, auditoria, fijarMinimo };
