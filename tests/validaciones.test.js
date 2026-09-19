const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarCantidad, validarEnteroNoNegativo, validarId } = require('../src/servicios/validaciones');
const { ErrorDeNegocio } = require('../src/servicios/errores');

test('validarCantidad acepta enteros positivos y devuelve el número', () => {
  assert.equal(validarCantidad(3), 3);
  assert.equal(validarCantidad('7', 'cantidad'), 7);
});

test('validarCantidad rechaza 0, negativos, decimales, texto y ausencia', () => {
  for (const invalido of [0, -1, 1.5, 'abc', undefined, null, '']) {
    assert.throws(() => validarCantidad(invalido, 'cantidad'), ErrorDeNegocio, `debió rechazar ${invalido}`);
  }
});

test('M-05: los booleanos se rechazan (no cuelan como 0/1)', () => {
  for (const invalido of [true, false]) {
    assert.throws(() => validarCantidad(invalido, 'cantidad'), ErrorDeNegocio, `debió rechazar ${invalido}`);
    assert.throws(() => validarEnteroNoNegativo(invalido, 'minimo'), ErrorDeNegocio, `debió rechazar ${invalido}`);
    assert.throws(() => validarId(invalido, 'id'), ErrorDeNegocio, `debió rechazar ${invalido}`);
  }
});

test('validarEnteroNoNegativo acepta 0 y rechaza -1 y 2.5', () => {
  assert.equal(validarEnteroNoNegativo(0, 'minimo'), 0);
  assert.throws(() => validarEnteroNoNegativo(-1, 'minimo'), ErrorDeNegocio);
  assert.throws(() => validarEnteroNoNegativo(2.5, 'minimo'), ErrorDeNegocio);
});

test('validarId acepta enteros >= 1 (número o texto) y rechaza el resto', () => {
  assert.equal(validarId(1, 'id'), 1);
  assert.equal(validarId('42', 'id'), 42);
  for (const invalido of [0, -1, 1.5, 'abc', undefined, null, '']) {
    assert.throws(() => validarId(invalido, 'id'), ErrorDeNegocio, `debió rechazar ${invalido}`);
  }
});

test('los errores tipados llevan estado HTTP', () => {
  assert.equal(new ErrorDeNegocio('x').estado, 400);
  assert.equal(require('../src/servicios/errores').NoEncontrado.prototype.estado, 404);
});
