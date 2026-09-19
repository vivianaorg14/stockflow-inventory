# ADR-005 — El inventario se descuenta al confirmar el despacho, no al crear el pedido

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-002 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md); depende de [ADR-007](ADR-007-despachos-parciales.md)

## Contexto y problema

Un pedido pasa por *solicitud* → *despacho físico*. El enunciado exige que todo movimiento quede
registrado y que un pedido pueda salir de varias bodegas, pero no fija en qué momento la
existencia baja.

## Factores de decisión

- Que los movimientos de `SALIDA` representen salidas físicas reales.
- Evitar comprometer dos veces las mismas unidades.
- Complejidad en el plazo de una semana.

## Alternativas consideradas

1. Descontar al crear el pedido.
2. Descontar al confirmar el despacho.
3. Reservar al crear y descontar al despachar.

## Decisión

Se elige **descontar al confirmar el despacho**. Crear un pedido no toca existencias; cada
despacho confirmado genera movimientos `SALIDA` y descuenta en ese momento, validando de nuevo
la disponibilidad.

### Consecuencias

- Positivas: pedido y salida física quedan separados; el historial de movimientos refleja lo que
  ocurrió de verdad.
- Negativas: sin reservas, dos pedidos pendientes pueden competir por las mismas unidades; el que
  despacha primero gana.
- Obligaciones: re-validar disponibilidad al despachar; rechazar el despacho si no alcanza.

## Pros y contras de las alternativas

### Descontar al crear

- ✅ La disponibilidad refleja compromisos de inmediato.
- ❌ Confunde solicitud con salida física; exige manejar cancelaciones como devoluciones.

### Descontar al despachar (elegida)

- ✅ Conceptualmente limpio; cada `SALIDA` es real.
- ❌ Competencia entre pedidos pendientes.

### Reservar + descontar

- ✅ Distingue físico / reservado / disponible.
- ❌ Reservas con vencimiento, cancelación y doble descuento: fuera del alcance de una semana.

## Evidencia en el código

`inventarioController.crearPedido` no modifica `ExistenciaPorBodega`;
`inventarioController.despacharPedido` descuenta y crea el `Movimiento` de tipo `SALIDA` dentro
de una transacción.
