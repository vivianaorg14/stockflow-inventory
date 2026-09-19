// Errores de dominio: el middleware manejarErrores los traduce a código HTTP.

class ErrorDeNegocio extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeNegocio';
  }
}
ErrorDeNegocio.prototype.estado = 400;

class NoEncontrado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'NoEncontrado';
  }
}
NoEncontrado.prototype.estado = 404;

module.exports = { ErrorDeNegocio, NoEncontrado };
