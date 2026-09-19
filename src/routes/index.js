// src/routes/index.js
// Punto central de rutas: conecta cada endpoint con su controlador.

const express = require('express');
const router = express.Router();

const productosCtrl = require('../controllers/productosController');
const bodegasCtrl = require('../controllers/bodegasController');
const movimientosCtrl = require('../controllers/movimientosController');
const inventarioCtrl = require('../controllers/inventarioController');
const pedidosCtrl = require('../controllers/pedidosController');
const authCtrl = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');

// Middleware global de autenticación en /api (permite retrocompatibilidad si no se envía header)
router.use(autenticar(false));

// --- Autenticación ---
router.post('/auth/login', authCtrl.login);
router.get('/auth/perfil', authCtrl.perfil);

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
router.get('/inventario/auditoria', inventarioCtrl.auditoria);
router.put('/inventario/existencias/:producto_id/:bodega_id/minimo', inventarioCtrl.fijarMinimo);

// --- Pedidos ---
router.get('/pedidos', pedidosCtrl.listar);
router.post('/pedidos', pedidosCtrl.crear);
router.post('/pedidos/:id/sugerir-reparto', pedidosCtrl.sugerirReparto);
router.post('/pedidos/:id/despachar', pedidosCtrl.despachar);
router.post('/pedidos/:id/cancelar', pedidosCtrl.cancelar);

module.exports = router;
