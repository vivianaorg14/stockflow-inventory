// src/models/Producto.js
// Representa un producto del inventario.
// Regla: estado puede ser ACTIVO o DESCONTINUADO.
// Regla: un producto DESCONTINUADO no admite entradas nuevas.
// Regla: el SKU es único y obligatorio (identificación operativa).

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // El SKU no puede repetirse
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('ACTIVO', 'DESCONTINUADO'),
    allowNull: false,
    defaultValue: 'ACTIVO'
  }
}, {
  tableName: 'productos',
  timestamps: true // Guarda fecha de creación y actualización automáticamente
});

module.exports = Producto;
