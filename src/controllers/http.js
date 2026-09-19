// Pegamento HTTP: envuelve manejadores async y traduce errores de dominio a códigos.

const capturar = (manejador) => (req, res, next) => {
  Promise.resolve(manejador(req, res, next)).catch(next);
};

// eslint-disable-next-line no-unused-vars -- Express exige 4 argumentos para un manejador de errores
function manejarErrores(err, req, res, next) {
  const estado = err.estado || err.status || (err.name === 'SequelizeValidationError' ? 400 : 500);
  if (estado === 500) console.error('Error no controlado:', err);
  res.status(estado).json({ error: err.message });
}

module.exports = { capturar, manejarErrores };
