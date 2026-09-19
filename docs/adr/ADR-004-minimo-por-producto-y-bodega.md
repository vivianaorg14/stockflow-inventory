# ADR-004 — Mínimo de inventario por producto y bodega

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-001 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md)

## Contexto y problema

La consulta obligatoria del enunciado ([08-enunciado](../08-enunciado.md)) exige "existencias por
producto y bodega, señalando las que están por debajo del mínimo". El enunciado no dice si el
mínimo es uno por producto o uno por cada par producto–bodega.

## Factores de decisión

- Precisión de la alerta en un escenario con tres bodegas de demanda distinta.
- Simplicidad del modelo de datos.
- Qué pasa cuando el mínimo no está configurado.

## Alternativas consideradas

1. Mínimo global por producto.
2. Mínimo por producto y bodega.
3. Mínimo global con sobrescritura por bodega.

## Decisión

Se elige **mínimo por producto y bodega**: el umbral vive en la relación de existencia, porque la
alerta debe señalar *dónde* falta stock, y cada bodega tiene demanda distinta.

### Consecuencias

- Positivas: la alerta identifica la bodega exacta; encaja con la consulta obligatoria.
- Negativas: hay que fijar un mínimo por cada par; un par sin configurar queda con mínimo 0 y nunca alerta.
- Obligaciones: `minimo ≥ 0`; la consulta compara `cantidad_actual < minimo` por fila.

## Pros y contras de las alternativas

### Mínimo global por producto

- ✅ Modelo mínimo, menos datos.
- ❌ Alerta imprecisa cuando las bodegas difieren en demanda.

### Mínimo por producto y bodega (elegida)

- ✅ Umbral por ubicación; la consulta obligatoria sale directa.
- ❌ Un campo más por fila; default cuando no se configura.

### Global con sobrescritura

- ✅ Flexible con valor por defecto.
- ❌ Regla de prioridad extra; más configuración de la que la prueba exige.

## Evidencia en el código

Campo `minimo` en el modelo `ExistenciaPorBodega`; comparación en `inventarioController.existencias`.
Por defecto `minimo: 0` cuando `ajustarExistencia` crea la fila (`movimientosController`).
