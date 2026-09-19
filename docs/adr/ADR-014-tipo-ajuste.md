# ADR-014 — Tipo de movimiento `AJUSTE` con sentido y motivo obligatorio

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** **complementa [ADR-003](ADR-003-inmutabilidad-movimientos.md)** (que sigue vigente en la inmutabilidad) y cierra `D-03`

## Contexto y problema

ADR-003 decidió que los errores se corrigen con un movimiento nuevo y mencionó un tipo
`AJUSTE`, pero el ENUM real solo tiene `ENTRADA | SALIDA | TRASLADO`. Registrar una
corrección como `ENTRADA` mezcla en la historia compras reales con arreglos de conteo, y la
auditoría de R3 no puede distinguirlos.

## Factores de decisión

- Que la historia diga la verdad: una corrección no es una compra.
- Mantener R4: un ajuste positivo a un producto descontinuado es una entrada.
- No complicar: un tipo, no un subsistema de reversiones.

## Alternativas consideradas

1. Dejar `ENTRADA`/`SALIDA` con el motivo en `notas` (lo que hay).
2. Tipo `AJUSTE` con campo `sentido ∈ {ENTRADA, SALIDA}` y `notas` obligatorio.
3. Reversión controlada: movimiento inverso enlazado al original (`movimiento_revertido_id`).

## Decisión

Se elige **`AJUSTE` con `sentido` y `notas` obligatorio** (opción 2). El ajuste afecta a una
sola bodega (`bodega_destino_id` si sentido ENTRADA, `bodega_origen_id` si SALIDA), pasa por
`ajustarExistencia` (nunca negativo) y cuenta en la auditoría con su signo.

### Consecuencias

- Positivas: la historia distingue operación de corrección; R3 auditable por tipo.
- Negativas: un campo más en el modelo y en el formulario.
- Obligaciones: `notas` vacío → 400; `AJUSTE` + `sentido=ENTRADA` sobre descontinuado → 400
  (R4); `sentido` ignorado/rechazado en los demás tipos.

## Pros y contras de las alternativas

### ENTRADA/SALIDA con notas

- ✅ Cero cambios.
- ❌ Historia ambigua; ADR-003 prometía otra cosa.

### AJUSTE con sentido (elegida)

- ✅ Explícito, barato, auditable.
- ❌ No enlaza con el movimiento corregido (queda en `notas`).

### Reversión enlazada

- ✅ Trazabilidad perfecta.
- ❌ Traslados exigen reversión doble; fuera del alcance.

## Evidencia en el código

ENUM (`ENTRADA`, `SALIDA`, `TRASLADO`, `AJUSTE`) y campo `sentido` en
`src/models/Movimiento.js`; `servicios/inventario.resolverEfecto` exige `sentido` y `notas` para
`AJUSTE`; `servicios/inventario.registrarMovimiento` rechaza el efecto de entrada (incluido
`AJUSTE`·`ENTRADA`) sobre un producto `DESCONTINUADO` y aplica el efecto vía `ajustarExistencia`.
Casos cubiertos en `tests/movimientos.test.js`.
