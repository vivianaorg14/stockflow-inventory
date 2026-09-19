// src/models/Usuario.js
// Representa un usuario del sistema con rol asignado.
// Extensión de diseño: modelo de roles (supervisor_mayor y supervisor_menor).
// Reglas:
//   - supervisor_mayor: no está atado a ninguna bodega (bodega_id = null). Máximo 1 en el sistema.
//   - supervisor_menor: atado obligatoriamente a una bodega (bodega_id != null). Máximo 1 por bodega.

const { DataTypes, Op } = require('sequelize');
const sequelize = require('../database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('supervisor_mayor', 'supervisor_menor'),
    allowNull: false
  },
  bodega_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'bodegas', key: 'id' }
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  validate: {
    validarReglasDeRol() {
      if (this.rol === 'supervisor_mayor' && this.bodega_id !== null && this.bodega_id !== undefined) {
        throw new Error('El supervisor_mayor no debe tener una bodega asignada');
      }
      if (this.rol === 'supervisor_menor' && !this.bodega_id) {
        throw new Error('El supervisor_menor debe tener una bodega obligatoria asignada');
      }
    }
  },
  hooks: {
    async beforeCreate(usuario) {
      if (usuario.rol === 'supervisor_mayor') {
        const existente = await Usuario.findOne({ where: { rol: 'supervisor_mayor' } });
        if (existente) {
          throw new Error('Solo puede existir exactamente 1 supervisor_mayor en el sistema');
        }
      } else if (usuario.rol === 'supervisor_menor') {
        const existente = await Usuario.findOne({
          where: { rol: 'supervisor_menor', bodega_id: usuario.bodega_id }
        });
        if (existente) {
          throw new Error(`Ya existe un supervisor_menor asignado a la bodega ${usuario.bodega_id}`);
        }
      }
    },
    async beforeUpdate(usuario) {
      if (usuario.changed('rol') || usuario.changed('bodega_id')) {
        if (usuario.rol === 'supervisor_mayor') {
          const existente = await Usuario.findOne({
            where: { rol: 'supervisor_mayor', id: { [Op.ne]: usuario.id } }
          });
          if (existente) {
            throw new Error('Solo puede existir exactamente 1 supervisor_mayor en el sistema');
          }
        } else if (usuario.rol === 'supervisor_menor') {
          const existente = await Usuario.findOne({
            where: {
              rol: 'supervisor_menor',
              bodega_id: usuario.bodega_id,
              id: { [Op.ne]: usuario.id }
            }
          });
          if (existente) {
            throw new Error(`Ya existe un supervisor_menor asignado a la bodega ${usuario.bodega_id}`);
          }
        }
      }
    }
  }
});

module.exports = Usuario;
