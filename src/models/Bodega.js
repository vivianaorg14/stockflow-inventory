// src/models/Bodega.js
// Representa una bodega o ubicación física donde se almacenan productos.

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Bodega = sequelize.define('Bodega', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ubicacion: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'bodegas',
  timestamps: true
});

module.exports = Bodega;
