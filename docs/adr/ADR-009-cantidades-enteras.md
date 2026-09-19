# ADR-009 — Cantidades enteras positivas

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-007 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md)

## Contexto y problema

El enunciado no dice si los productos se miden por unidad, peso o volumen. Los decimales exigen
definir precisión, redondeo y unidades de medida.

## Factores de decisión

- El alcance de la prueba es el inventario multibodega, no la metrología.
- Errores de precisión en coma flotante frente a existencias que "nunca cuadran".

## Alternativas consideradas

1. Enteras.
2. Decimales con precisión fija.
3. Según unidad de medida por producto.

## Decisión

Se elige **cantidades enteras > 0** en todo movimiento, despacho y existencia.

### Consecuencias

- Positivas: validación trivial (`Number.isInteger`), sin problemas de redondeo.
- Negativas: sin peso, volumen ni conversión de unidades.
- Obligaciones: rechazar decimales y no positivos en **todas** las entradas de cantidad
  (movimientos, ítems de pedido, despachos).

## Pros y contras de las alternativas

### Enteras (elegida)

- ✅ Simple y exacta.
- ❌ No cubre productos a granel.

### Decimales

- ✅ Flexible.
- ❌ Precisión, redondeo y comparaciones con tolerancia.

### Por unidad de medida

- ✅ Lo más realista.
- ❌ Modelo y conversiones fuera del alcance de una semana.

## Evidencia en el código

`movimientosController.registrar` valida `Number.isInteger(cantidad) && cantidad > 0`.
`crearPedido` y `despacharPedido` solo validan `> 0`, **no** que sea entero — brecha registrada en
[06-pendientes](../06-pendientes.md).
