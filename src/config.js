// src/config.js
// Carga `.env` (raíz del proyecto) con dotenv y expone la configuración ya resuelta.
// Se requiere desde index.js y database.js antes de leer cualquier variable.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const raiz = path.join(__dirname, '..');
const storageConfigurado = process.env.DB_STORAGE || 'stockflow.sqlite';
// ':memory:' se pasa tal cual; una ruta relativa se resuelve contra la raíz del proyecto.
const almacenamiento = storageConfigurado === ':memory:' ? storageConfigurado : path.resolve(raiz, storageConfigurado);

module.exports = {
  puerto: Number(process.env.PORT) || 3000,
  almacenamiento
};
