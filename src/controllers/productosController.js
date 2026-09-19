// src/controllers/productosController.js
// Traduce HTTP ↔ modelo Producto. Sin try/catch: capturar() reenvía al manejador de errores.

const { Producto } = require('../models');
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

// POST /productos — crea un producto nuevo
const crear = capturar(async (req, res) => {
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
