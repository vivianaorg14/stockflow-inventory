// index.js — Punto de entrada de StockFlow
// Levanta el servidor Express y sincroniza la base de datos.

const express = require('express');
const { sincronizar } = require('./src/models');
const rutas = require('./src/routes');

const app = express();
const PUERTO = process.env.PORT || 3000;

// Middleware para leer JSON en el body de las peticiones
app.use(express.json());

// Registrar todas las rutas bajo el prefijo /api
app.use('/api', rutas);

// Ruta raíz informativa
app.get('/', (req, res) => {
  res.json({
    sistema: 'StockFlow — Inventario Multibodega',
    version: '1.0.0',
    endpoints: {
      productos: '/api/productos',
      bodegas: '/api/bodegas',
      movimientos: '/api/movimientos',
      existencias: '/api/inventario/existencias',
      pedidos: '/api/pedidos'
    }
  });
});

// Iniciar servidor: primero sincroniza los modelos con la BD, luego escucha
sincronizar(false)
  .then(() => {
    app.listen(PUERTO, () => {
      console.log(`✅ StockFlow corriendo en http://localhost:${PUERTO}`);
      console.log(`📦 Consulta obligatoria: http://localhost:${PUERTO}/api/inventario/existencias`);
    });
  })
  .catch(err => {
    console.error('❌ Error al iniciar la base de datos:', err);
    process.exit(1);
  });
