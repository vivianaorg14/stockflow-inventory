// index.js — Punto de entrada de StockFlow
// Sincroniza la base de datos y levanta el servidor.

const { puerto: PUERTO } = require('./src/config');
const app = require('./src/app');
const { sincronizar } = require('./src/models');

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
