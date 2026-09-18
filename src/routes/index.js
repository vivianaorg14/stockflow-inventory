// src/routes/index.js
// Punto central de rutas: conecta cada endpoint con su controlador.

const express = require('express');
const router = express.Router();

const productosCtrl = require('../controllers/productosController');
const bodegasCtrl = require('../controllers/bodegasController');
const movimientosCtrl = require('../controllers/movimientosController');
const inventarioCtrl = require('../controllers/inventarioController');

// --- Productos ---
router.get('/productos', productosCtrl.listar);
router.get('/productos/:id', productosCtrl.obtener);
router.post('/productos', productosCtrl.crear);
router.patch('/productos/:id/descontinuar', productosCtrl.descontinuar);

// --- Bodegas ---
router.get('/bodegas', bodegasCtrl.listar);
router.post('/bodegas', bodegasCtrl.crear);

// --- Movimientos (solo POST — inmutables por ADR-003) ---
router.get('/movimientos', movimientosCtrl.listar);
router.post('/movimientos', movimientosCtrl.registrar);

// --- Consulta obligatoria del enunciado ---
router.get('/inventario/existencias', inventarioCtrl.existencias);

// --- Pedidos ---
router.get('/pedidos', inventarioCtrl.listarPedidos);
router.post('/pedidos', inventarioCtrl.crearPedido);
router.post('/pedidos/:id/despachar', inventarioCtrl.despacharPedido);

module.exports = router;
