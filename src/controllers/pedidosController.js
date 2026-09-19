// src/controllers/pedidosController.js
// Traduce HTTP ↔ servicio de pedidos.

const { capturar } = require('./http');
const pedidos = require('../servicios/pedidos');
const { validarId } = require('../servicios/validaciones');

const listar = capturar(async (req, res) => {
  res.json(await pedidos.listarPedidos());
});

const crear = capturar(async (req, res) => {
  res.status(201).json(await pedidos.crearPedido(req.body));
});

const despachar = capturar(async (req, res) => {
  const id = validarId(req.params.id, 'id');
  const { estado, pedido } = await pedidos.despachar(id, req.body.despachos);
  res.json({ mensaje: `Pedido ${estado}`, pedido });
});

const cancelar = capturar(async (req, res) => {
  res.json(await pedidos.cancelar(validarId(req.params.id, 'id')));
});

module.exports = { listar, crear, despachar, cancelar };
