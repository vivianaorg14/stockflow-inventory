// src/controllers/bodegasController.js
// Traduce HTTP ↔ modelo Bodega. Sin try/catch: capturar() reenvía al manejador de errores.

const { Bodega } = require('../models');
const { capturar } = require('./http');
const { ErrorDeNegocio } = require('../servicios/errores');

// GET /bodegas — devuelve todas las bodegas
const listar = capturar(async (req, res) => {
  const bodegas = await Bodega.findAll({ order: [['nombre', 'ASC']] });
  res.json(bodegas);
});

// POST /bodegas — crea una bodega nueva
const crear = capturar(async (req, res) => {
  const { nombre, ubicacion } = req.body;

  if (!nombre) {
    throw new ErrorDeNegocio('El nombre de la bodega es obligatorio');
  }

  const bodega = await Bodega.create({ nombre, ubicacion });
  res.status(201).json(bodega);
});

module.exports = { listar, crear };
