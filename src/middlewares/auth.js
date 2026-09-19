// src/middlewares/auth.js
// Middlewares de autenticación y autorización por roles (supervisor_mayor y supervisor_menor).

const { verificarToken } = require('../servicios/auth');

// Middleware de autenticación
// Si obligatorio es true, exige Authorization: Bearer <token> (401 si falta o falla).
// Si obligatorio es false, permite pasar asignando rol supervisor_mayor por defecto (retrocompatibilidad).
function autenticar(obligatorio = false) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const payload = verificarToken(token);
        req.usuario = payload;
        return next();
      } catch (err) {
        return res.status(401).json({ error: `Autenticación fallida: ${err.message}` });
      }
    }

    if (obligatorio) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Usuario por defecto para llamadas sin token (retrocompatibilidad de tests y demo)
    req.usuario = {
      rol: 'supervisor_mayor',
      bodega_id: null,
      esPorDefecto: true
    };
    next();
  };
}

// Middleware de autorización por rol
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado: rol no autorizado para esta operación' });
    }
    next();
  };
}

// Middleware para restringir operaciones de supervisor_menor a su propia bodega
function restringirBodega(extractorBodegaId) {
  return (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'supervisor_menor') {
      const bodegaObjetivo = Number(extractorBodegaId(req));
      if (bodegaObjetivo && bodegaObjetivo !== Number(req.usuario.bodega_id)) {
        return res.status(403).json({
          error: `Acceso denegado: el supervisor_menor solo puede operar sobre su propia bodega (${req.usuario.bodega_id})`
        });
      }
    }
    next();
  };
}

module.exports = {
  autenticar,
  requerirRol,
  restringirBodega
};
