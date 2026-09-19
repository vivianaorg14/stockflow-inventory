// src/controllers/authController.js
// Controlador para autenticación y consulta de perfil de usuario.

const { capturar } = require('./http');
const { autenticarUsuario, obtenerUsuarioPorId } = require('../servicios/auth');

const login = capturar(async (req, res) => {
  const { username, password } = req.body;
  const resultado = await autenticarUsuario(username, password);
  res.json(resultado);
});

const perfil = capturar(async (req, res) => {
  if (!req.usuario || req.usuario.esPorDefecto) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  const usuario = await obtenerUsuarioPorId(req.usuario.id);
  res.json({
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    rol: usuario.rol,
    bodega_id: usuario.bodega_id,
    bodega: usuario.bodega
  });
});

module.exports = {
  login,
  perfil
};
