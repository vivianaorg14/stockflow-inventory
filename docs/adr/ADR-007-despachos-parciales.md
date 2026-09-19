# ADR-007 — Despachos parciales permitidos

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-004 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md); consecuencia de [ADR-005](ADR-005-descuento-al-despachar.md)

## Contexto y problema

Si el descuento ocurre al despachar y ninguna bodega tiene la cantidad completa, hay que decidir
si el pedido espera hasta poder cubrirse entero o si se entrega lo disponible.

## Factores de decisión

- Aprovechar unidades disponibles.
- Cantidad de estados y validaciones que introduce.

## Alternativas consideradas

1. Solo pedidos completos.
2. Despachos parciales, conservando la cantidad pendiente.
3. Parciales bajo condiciones (confirmación, fecha límite).

## Decisión

Se elige **permitir despachos parciales**. Un pedido puede recibir varios despachos hasta
completar cada ítem; `pendiente = solicitada − despachada`.

### Consecuencias

- Positivas: se entrega lo que hay; encaja con el despacho multibodega en varios momentos.
- Negativas: el pedido tiene ciclo de vida con estados.
- Obligaciones: estados `PENDIENTE` → `PARCIALMENTE_DESPACHADO` → `COMPLETADO` (y `CANCELADO`);
  nunca despachar más de lo pendiente; recalcular el estado tras cada despacho.

## Pros y contras de las alternativas

### Solo completos

- ✅ Un estado menos.
- ❌ Unidades disponibles sin usar; no representa entregas escalonadas.

### Parciales (elegida)

- ✅ Refleja la operación real.
- ❌ Tres cantidades por ítem y máquina de estados.

### Parciales condicionados

- ✅ Más control.
- ❌ Reglas y pruebas extra sin pedirlo el enunciado.

## Evidencia en el código

`ItemPedido.cantidad_solicitada` / `cantidad_despachada`; cálculo de `nuevoEstado` al final de
`inventarioController.despacharPedido`. `CANCELADO` existe en el ENUM pero no hay endpoint que lo
asigne (ver pendiente en [06-pendientes](../06-pendientes.md)).
