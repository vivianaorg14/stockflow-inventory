// Única implementación de las reglas de cantidad (ADR-009).

const { ErrorDeNegocio } = require('./errores');

function aEntero(valor, campo) {
  if (valor === undefined || valor === null || valor === '') {
    throw new ErrorDeNegocio(`${campo} es obligatorio`);
  }
  if (typeof valor === 'boolean') {
    throw new ErrorDeNegocio(`${campo} debe ser un número entero`);
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    throw new ErrorDeNegocio(`${campo} debe ser un número entero`);
  }
  return numero;
}

// Cantidades de movimientos, ítems y despachos: enteras y > 0.
function validarCantidad(valor, campo = 'cantidad') {
  const numero = aEntero(valor, campo);
  if (numero <= 0) throw new ErrorDeNegocio(`${campo} debe ser un entero positivo`);
  return numero;
}

// Mínimos de existencia: enteros y >= 0.
function validarEnteroNoNegativo(valor, campo) {
  const numero = aEntero(valor, campo);
  if (numero < 0) throw new ErrorDeNegocio(`${campo} no puede ser negativo`);
  return numero;
}

// Ids de ruta: enteros >= 1. Evita que `Number('abc') = NaN` llegue a una consulta SQL.
function validarId(valor, campo) {
  const numero = aEntero(valor, campo);
  if (numero < 1) throw new ErrorDeNegocio(`${campo} debe ser un entero positivo`);
  return numero;
}

module.exports = { validarCantidad, validarEnteroNoNegativo, validarId };
