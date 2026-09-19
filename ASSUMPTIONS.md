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
| AS-008 | ¿Usuarios y permisos por bodega? | Sin autenticación en v1; limitación declarada | [ADR-010](docs/adr/ADR-010-sin-usuarios-ni-permisos.md) |

## Dependencias entre decisiones

- AS-002 (descuento al despachar) obliga a AS-004 (parciales) y a re-validar stock en cada despacho.
- AS-003 (manual) determina el cuerpo de `POST /api/pedidos/:id/despachar`.
- AS-005 (inmutabilidad) es lo que hace cumplible la regla R3 del enunciado.
- AS-001 (mínimo por par) define la forma de la consulta obligatoria.
- AS-007 (enteras) aplica a **toda** entrada de cantidad; hoy no se cumple en pedidos (`D-08`).

## Fuera de alcance de la primera versión

Autenticación y permisos por bodega · reservas con vencimiento · asignación automática de
bodegas · lotes, vencimientos y números de serie · unidades de medida y conversión ·
integraciones externas · despliegue productivo · frontend ([ADR-011](docs/adr/ADR-011-api-sin-frontend.md)).
