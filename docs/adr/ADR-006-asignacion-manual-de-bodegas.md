# ADR-006 — Asignación manual de bodegas en el despacho

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-003 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md)

## Contexto y problema

El enunciado exige que "un pedido se puede despachar desde varias bodegas si ninguna tiene la
cantidad completa", pero no dice quién decide cuánto sale de cada una.

## Factores de decisión

- El enunciado no pide ningún criterio logístico (distancia, costo, prioridad).
- Cada criterio automático añade casos de prueba y justificación en la defensa.
- Demostrar la regla multibodega con el menor código posible.

## Alternativas consideradas

1. Asignación manual: el usuario indica bodega y cantidad por línea.
2. Asignación automática por un criterio (mayor existencia, prioridad fija…).
3. Propuesta automática con confirmación manual.

## Decisión

Se elige **asignación manual**. El cliente envía una lista de despachos
`{ item_pedido_id, bodega_id, cantidad }` y el sistema valida cada uno.

### Consecuencias

- Positivas: sin algoritmo que justificar; el despacho multibodega queda demostrado.
- Negativas: más trabajo para el usuario; nada impide elegir una bodega subóptima.
- Obligaciones: validar cantidad > 0, no superar la existencia de la bodega, no superar lo
  pendiente del ítem.

## Pros y contras de las alternativas

### Manual (elegida)

- ✅ Explícita, trivial de probar.
- ❌ Depende del operador.

### Automática

- ✅ Menos trabajo manual.
- ❌ Hay que elegir y defender un criterio que el enunciado no da.

### Propuesta + confirmación

- ✅ Lo mejor de ambas.
- ❌ Implementar la propuesta *y* la edición: fuera de plazo.

## Evidencia en el código

`inventarioController.despacharPedido`: itera `req.body.despachos` y valida por bodega. La
automatización queda como mejora futura (sin pendiente abierto: no la pide el enunciado).
