// src/models/Pedido.js
// Representa una solicitud de despacho de productos.
// Regla (AS-004): se permiten despachos parciales.
//   Estados posibles: PENDIENTE → PARCIALMENTE_DESPACHADO → COMPLETADO
//                                                          → CANCELADO
// Regla (AS-002): el inventario se descuenta al confirmar el despacho,
//   no al crear el pedido.

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Pedido = sequelize.define('Pedido', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'PARCIALMENTE_DESPACHADO', 'COMPLETADO', 'CANCELADO'),
    allowNull: false,
    defaultValue: 'PENDIENTE'
  }
}, {
  tableName: 'pedidos',
  timestamps: true
});

// ItemPedido: línea de detalle de un pedido
// Guarda qué producto, cuánto se pidió y cuánto se ha despachado hasta ahora
const ItemPedido = sequelize.define('ItemPedido', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pedido_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pedidos', key: 'id' }
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'productos', key: 'id' }
  },
  cantidad_solicitada: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  cantidad_despachada: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  }
}, {
  tableName: 'items_pedido',
  timestamps: true
});

module.exports = { Pedido, ItemPedido };
