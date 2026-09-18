// src/controllers/productosController.js
// Lógica de negocio para crear y consultar productos.

const { Producto } = require('../models');

// GET /productos — devuelve todos los productos
const listar = async (req, res) => {
  try {
    const productos = await Producto.findAll({ order: [['nombre', 'ASC']] });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /productos/:id — devuelve un producto por ID
const obtener = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /productos — crea un producto nuevo
const crear = async (req, res) => {
  try {
    const { sku, nombre, descripcion, estado } = req.body;

    // Validaciones básicas
    if (!sku || !nombre) {
      return res.status(400).json({ error: 'El SKU y el nombre son obligatorios' });
    }

    // Verificar que el SKU no exista ya (AS-006)
    const existe = await Producto.findOne({ where: { sku } });
    if (existe) {
      return res.status(400).json({ error: `Ya existe un producto con SKU "${sku}"` });
    }

    const producto = await Producto.create({ sku, nombre, descripcion, estado });
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /productos/:id/descontinuar — marca un producto como DESCONTINUADO
const descontinuar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    await producto.update({ estado: 'DESCONTINUADO' });
    res.json({ mensaje: `Producto "${producto.nombre}" marcado como DESCONTINUADO`, producto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { listar, obtener, crear, descontinuar };
