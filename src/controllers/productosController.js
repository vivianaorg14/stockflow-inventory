// src/controllers/productosController.js
// Traduce HTTP ↔ modelo Producto. Sin try/catch: capturar() reenvía al manejador de errores.

const { Producto, Bodega, ExistenciaPorBodega } = require('../models');
const { capturar } = require('./http');
const { ErrorDeNegocio, NoEncontrado } = require('../servicios/errores');

const ESTADOS = ['ACTIVO', 'DESCONTINUADO'];

// GET /productos — devuelve todos los productos
const listar = capturar(async (req, res) => {
  const productos = await Producto.findAll({ order: [['nombre', 'ASC']] });
  res.json(productos);
});

// GET /productos/:id — devuelve un producto por ID
const obtener = capturar(async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new NoEncontrado('Producto no encontrado');
  res.json(producto);
});

// POST /productos — crea un producto nuevo (solo supervisor_menor)
const crear = capturar(async (req, res) => {
  if (req.usuario && req.usuario.rol === 'supervisor_mayor') {
    return res.status(403).json({
      error: 'Acceso denegado: el supervisor_mayor no puede crear productos'
    });
  }

  const { sku, nombre, descripcion, estado } = req.body;

  // Validaciones básicas
  if (!sku || !nombre) {
    throw new ErrorDeNegocio('El SKU y el nombre son obligatorios');
  }
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    throw new ErrorDeNegocio(`estado debe ser uno de ${ESTADOS.join(', ')}`);
  }

  // Verificar que el SKU no exista ya (AS-006)
  const existe = await Producto.findOne({ where: { sku } });
  if (existe) {
    throw new ErrorDeNegocio(`Ya existe un producto con SKU "${sku}"`);
  }

  const producto = await Producto.create({ sku, nombre, descripcion, estado });

  if (req.body.inicializar_existencias) {
    const bodegas = await Bodega.findAll();
    for (const b of bodegas) {
      await ExistenciaPorBodega.findOrCreate({
        where: { producto_id: producto.id, bodega_id: b.id },
        defaults: { cantidad_actual: 0, minimo: 0 }
      });
    }
  }

  res.status(201).json(producto);
});

// PATCH /productos/:id/descontinuar — marca un producto como DESCONTINUADO
const descontinuar = capturar(async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new NoEncontrado('Producto no encontrado');

  await producto.update({ estado: 'DESCONTINUADO' });
  res.json({ mensaje: `Producto "${producto.nombre}" marcado como DESCONTINUADO`, producto });
});

module.exports = { listar, obtener, crear, descontinuar };
