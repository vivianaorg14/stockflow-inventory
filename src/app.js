// src/app.js
// Construye la aplicación Express sin escuchar: la usan index.js y los tests.

const path = require('path');
const express = require('express');
const rutas = require('./routes');
const { manejarErrores } = require('./controllers/http');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api', (req, res) => {
  res.json({
    sistema: 'StockFlow — Inventario Multibodega',
    version: '1.1.0',
    endpoints: {
      productos: '/api/productos',
      bodegas: '/api/bodegas',
      movimientos: '/api/movimientos',
      existencias: '/api/inventario/existencias',
      auditoria: '/api/inventario/auditoria',
      pedidos: '/api/pedidos'
    }
  });
});

app.use('/api', rutas);

app.use(manejarErrores);

module.exports = app;
