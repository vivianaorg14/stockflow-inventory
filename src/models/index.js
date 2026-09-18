// src/models/index.js
// Punto central que importa todos los modelos y define sus relaciones.
// Las relaciones de Sequelize controlan cómo se hacen los JOINs
// y qué campos de FK se validan automáticamente.

const sequelize = require('../database');
const Producto = require('./Producto');
const Bodega = require('./Bodega');
const ExistenciaPorBodega = require('./ExistenciaPorBodega');
const Movimiento = require('./Movimiento');
const { Pedido, ItemPedido } = require('./Pedido');

// --- Relaciones ---

// Un producto puede estar en muchas bodegas (a través de ExistenciaPorBodega)
Producto.hasMany(ExistenciaPorBodega, { foreignKey: 'producto_id', as: 'existencias' });
ExistenciaPorBodega.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Una bodega puede tener muchos productos
Bodega.hasMany(ExistenciaPorBodega, { foreignKey: 'bodega_id', as: 'existencias' });
ExistenciaPorBodega.belongsTo(Bodega, { foreignKey: 'bodega_id', as: 'bodega' });

// Un movimiento pertenece a un producto
Movimiento.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Un movimiento puede tener bodega de origen y/o destino
Movimiento.belongsTo(Bodega, { foreignKey: 'bodega_origen_id', as: 'bodegaOrigen' });
Movimiento.belongsTo(Bodega, { foreignKey: 'bodega_destino_id', as: 'bodegaDestino' });

// Un pedido tiene muchos ítems
Pedido.hasMany(ItemPedido, { foreignKey: 'pedido_id', as: 'items' });
ItemPedido.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });

// Un ítem de pedido referencia un producto
ItemPedido.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Función para sincronizar todos los modelos con la base de datos
// force: false → no borra tablas existentes (para producción)
// force: true  → borra y recrea (solo para desarrollo/seeds)
const sincronizar = (force = false) => sequelize.sync({ force });

module.exports = {
  sequelize,
  sincronizar,
  Producto,
  Bodega,
  ExistenciaPorBodega,
  Movimiento,
  Pedido,
  ItemPedido
};
