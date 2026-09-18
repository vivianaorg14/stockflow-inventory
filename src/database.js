// src/database.js
// Configuración de la conexión a SQLite usando Sequelize.
// SQLite guarda todo en un archivo local llamado stockflow.sqlite.
// No se necesita instalar ningún servidor de base de datos.

const { Sequelize } = require('sequelize');
const path = require('path');

// El archivo de base de datos se crea en la raíz del proyecto
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'stockflow.sqlite'),
  logging: false // Cambiar a console.log si quieres ver las queries SQL en consola
});

module.exports = sequelize;
