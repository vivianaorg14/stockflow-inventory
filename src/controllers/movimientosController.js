// src/controllers/movimientosController.js
// Traduce HTTP ↔ servicio de inventario. Las reglas viven en src/servicios/inventario.js.

const { capturar } = require('./http');
const inventario = require('../servicios/inventario');

const listar = capturar(async (req, res) => {
  const movimientos = await inventario.listarMovimientos();
  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    const filtrados = movimientos.filter(m =>
      m.bodega_origen_id === req.usuario.bodega_id || m.bodega_destino_id === req.usuario.bodega_id
    );
    return res.json(filtrados);
  }
  res.json(movimientos);
});

const registrar = capturar(async (req, res) => {
  // Solo el supervisor_menor puede registrar movimientos
  if (req.usuario && req.usuario.rol === 'supervisor_mayor') {
    return res.status(403).json({
      error: 'Acceso denegado: el supervisor_mayor solo puede consultar el historial de movimientos, no registrar nuevos'
    });
  }

  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    const miBodega = req.usuario.bodega_id;
    const { tipo, bodega_origen_id, bodega_destino_id, sentido } = req.body;

    let bodegaAfectada;
    if (tipo === 'ENTRADA') bodegaAfectada = bodega_destino_id;
    else if (tipo === 'SALIDA') bodegaAfectada = bodega_origen_id;
    else if (tipo === 'TRASLADO') bodegaAfectada = bodega_origen_id; // debe salir de su propia bodega
    else if (tipo === 'AJUSTE') bodegaAfectada = sentido === 'ENTRADA' ? bodega_destino_id : (bodega_origen_id || bodega_destino_id);

    if (Number(bodegaAfectada) !== Number(miBodega)) {
      return res.status(403).json({
        error: `Acceso denegado: el supervisor_menor solo puede registrar movimientos en su propia bodega (${miBodega})`
      });
    }
  }

  const movimiento = await inventario.registrarMovimiento(req.body);
  res.status(201).json({ mensaje: 'Movimiento registrado correctamente', movimiento });
});

module.exports = { listar, registrar };
