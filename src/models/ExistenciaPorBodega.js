// src/models/ExistenciaPorBodega.js
// Registra cuántas unidades hay de un producto en una bodega específica.
// También almacena el mínimo requerido para generar alertas.
// Regla (AS-001): el mínimo es específico por producto y bodega.
// Regla: la cantidad_actual nunca puede ser negativa.

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ExistenciaPorBodega = sequelize.define('ExistenciaPorBodega', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'productos', key: 'id' }
  },
  bodega_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bodegas', key: 'id' }
  },
  cantidad_actual: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0 // La existencia nunca puede ser negativa
    }
  },
  minimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'existencias_por_bodega',
  timestamps: true,
  indexes: [{ unique: true, fields: ['producto_id', 'bodega_id'] }] // D-10: un par, una fila
});

module.exports = ExistenciaPorBodega;
