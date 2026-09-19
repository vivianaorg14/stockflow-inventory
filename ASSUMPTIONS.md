# ASSUMPTIONS.md — StockFlow

Decisiones tomadas sobre lo que el [enunciado](docs/08-enunciado.md) no define. Este archivo es
el **resumen**; cada decisión tiene su registro completo (contexto, alternativas, consecuencias,
evidencia en el código) en [`docs/adr/`](docs/adr/README.md). El análisis largo original está
congelado en [`docs/_archivo/2026-09-18-analisis-asunciones.md`](docs/_archivo/2026-09-18-analisis-asunciones.md).

| ID | Pregunta | Decisión | Registro |
|---|---|---|---|
| AS-001 | ¿Mínimo global por producto o por bodega? | Por producto **y** bodega | [ADR-004](docs/adr/ADR-004-minimo-por-producto-y-bodega.md) |
| AS-002 | ¿Se descuenta al crear el pedido o al despachar? | Al confirmar el despacho, re-validando disponibilidad | [ADR-005](docs/adr/ADR-005-descuento-al-despachar.md) |
| AS-003 | ¿Asignación de bodegas manual o automática? | Manual: el cliente indica bodega y cantidad | [ADR-006](docs/adr/ADR-006-asignacion-manual-de-bodegas.md) |
| AS-004 | ¿Se permiten despachos parciales? | Sí, con estados `PENDIENTE` → `PARCIALMENTE_DESPACHADO` → `COMPLETADO` | [ADR-007](docs/adr/ADR-007-despachos-parciales.md) |
| AS-005 | ¿Se editan o borran movimientos? | No: inmutables; se corrige con un movimiento nuevo | [ADR-003](docs/adr/ADR-003-inmutabilidad-movimientos.md) |
| AS-006 | ¿Cómo se identifica un producto? | `id` interno + `sku` único obligatorio | [ADR-008](docs/adr/ADR-008-identificacion-de-productos.md) |
| AS-007 | ¿Cantidades enteras o decimales? | Enteras > 0 | [ADR-009](docs/adr/ADR-009-cantidades-enteras.md) |
| AS-008 | ¿Usuarios y permisos por bodega? | Sin autenticación en v1 base; extendido en v1.2 | [ADR-010](docs/adr/ADR-010-sin-usuarios-ni-permisos.md) / [ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md) |
| AS-009 | ¿Modelo de roles y permisos? | Jerarquía: 1 `supervisor_mayor` (global) y 1 `supervisor_menor` por bodega con JWT nativo | [ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md) |
| AS-010 | ¿Límite en cantidad de bodegas? | Estrictamente 3 bodegas (rechazo con 400 si se intenta crear una cuarta) | [ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md) |
| AS-011 | ¿Balanceo de inventario en pedidos? | Sugerencia analítica de reparto basada en excedente sobre el stock mínimo (solo lectura) | [ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md) |

## Dependencias entre decisiones

- AS-002 (descuento al despachar) obliga a AS-004 (parciales) y a re-validar stock en cada despacho.
- AS-003 (manual) determina el cuerpo de `POST /api/pedidos/:id/despachar`. Se complementa con AS-011 (balanceo sugerido por sistema).
- AS-005 (inmutabilidad) es lo que hace cumplible la regla R3 del enunciado.
- AS-001 (mínimo por par) define la forma de la consulta obligatoria y es la base de cálculo de AS-011 (balanceo).
- AS-009 (roles) restringe las operaciones de despacho (AS-003) y movimientos al supervisor local asignado a cada bodega.
- AS-010 (3 bodegas) garantiza la regla estructural de 1 supervisor menor por cada una de las 3 bodegas de la red.

## Extensiones de diseño incorporadas

- Autenticación JWT y control de acceso basado en roles (`supervisor_mayor` y `supervisor_menor`) ([ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md)).
- Restricción estricta de 3 bodegas y balanceo inteligente sugerido ([ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md)).
- Frontend ligero estático en Vanilla JS/CSS ([ADR-013](docs/adr/ADR-013-frontend-estatico.md)).
