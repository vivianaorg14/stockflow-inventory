// src/controllers/bodegasController.js
// Lógica de negocio para crear y consultar bodegas.

const { Bodega } = require('../models');

// GET /bodegas — devuelve todas las bodegas
const listar = async (req, res) => {
  try {
    const bodegas = await Bodega.findAll({ order: [['nombre', 'ASC']] });
    res.json(bodegas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /bodegas — crea una bodega nueva
const crear = async (req, res) => {
  try {
    const { nombre, ubicacion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la bodega es obligatorio' });
    }

    const bodega = await Bodega.create({ nombre, ubicacion });
    res.status(201).json(bodega);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { listar, crear };
