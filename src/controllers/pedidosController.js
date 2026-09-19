// src/controllers/pedidosController.js
// Traduce HTTP ↔ servicio de pedidos.

const { capturar } = require('./http');
const pedidos = require('../servicios/pedidos');
const { validarId } = require('../servicios/validaciones');

const listar = capturar(async (req, res) => {
  res.json(await pedidos.listarPedidos());
});

const crear = capturar(async (req, res) => {
  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    return res.status(403).json({ error: 'Acceso denegado: solo el supervisor_mayor puede crear pedidos' });
  }
  res.status(201).json(await pedidos.crearPedido(req.body));
});

const despachar = capturar(async (req, res) => {
  const id = validarId(req.params.id, 'id');

  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    const miBodega = req.usuario.bodega_id;
    const despachos = Array.isArray(req.body.despachos) ? req.body.despachos : [];
    const intentoAjeno = despachos.some(d => Number(d.bodega_id) !== Number(miBodega));
    if (intentoAjeno) {
      return res.status(403).json({
        error: `Acceso denegado: el supervisor_menor solo puede despachar desde su propia bodega (${miBodega})`
      });
    }
  }

  const { estado, pedido } = await pedidos.despachar(id, req.body.despachos);
  res.json({ mensaje: `Pedido ${estado}`, pedido });
});

const cancelar = capturar(async (req, res) => {
  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    return res.status(403).json({ error: 'Acceso denegado: solo el supervisor_mayor puede cancelar pedidos' });
  }
  res.json(await pedidos.cancelar(validarId(req.params.id, 'id')));
});

const sugerirReparto = capturar(async (req, res) => {
  if (req.usuario && req.usuario.rol === 'supervisor_menor') {
    return res.status(403).json({ error: 'Acceso denegado: solo el supervisor_mayor puede solicitar sugerencias de balanceo' });
  }
  const id = validarId(req.params.id, 'id');
  const propuesta = await pedidos.sugerirReparto(id);
  res.json(propuesta);
});

module.exports = { listar, crear, despachar, cancelar, sugerirReparto };
