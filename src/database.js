// src/database.js
// Conexión a SQLite con Sequelize. Por defecto usa el fichero stockflow.sqlite
// en la raíz (configurable con DB_STORAGE en `.env`); los tests fijan ':memory:' antes de cargar este módulo.

const { Sequelize } = require('sequelize');
const { almacenamiento } = require('./config');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: almacenamiento,
  logging: false
});

module.exports = sequelize;
