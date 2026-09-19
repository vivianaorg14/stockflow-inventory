// src/models/Movimiento.js
// Registra cada operación de inventario: ENTRADA, SALIDA, TRASLADO o AJUSTE.
// Regla (ADR-003): los movimientos confirmados son INMUTABLES.
//   No existe PUT ni DELETE para movimientos. Solo INSERT.
// Regla: un TRASLADO tiene bodega_origen_id y bodega_destino_id.
// Regla: una ENTRADA solo tiene bodega_destino_id.
// Regla: una SALIDA solo tiene bodega_origen_id.
// Regla (ADR-014): un AJUSTE tiene `sentido` (ENTRADA o SALIDA) y una sola bodega,
//   según ese sentido (bodega_destino_id si ENTRADA, bodega_origen_id si SALIDA).

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Movimiento = sequelize.define('Movimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo: {
    type: DataTypes.ENUM('ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE'),
    allowNull: false
  },
  // Solo para AJUSTE (ADR-014): hacia dónde corrige la existencia.
  sentido: {
    type: DataTypes.ENUM('ENTRADA', 'SALIDA'),
    allowNull: true
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'productos', key: 'id' }
  },
  bodega_origen_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Solo aplica en SALIDA y TRASLADO
    references: { model: 'bodegas', key: 'id' }
  },
  bodega_destino_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Solo aplica en ENTRADA y TRASLADO
    references: { model: 'bodegas', key: 'id' }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1 // Las cantidades deben ser enteros positivos (AS-007)
    }
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true // Útil para registrar motivos de ajuste
  }
}, {
  tableName: 'movimientos',
  timestamps: true // createdAt actúa como fecha del movimiento
});

module.exports = Movimiento;
