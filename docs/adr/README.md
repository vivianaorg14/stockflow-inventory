# ADR — Registros de decisión de arquitectura

Un ADR registra **una** decisión con sus alternativas y consecuencias, en el momento en que se
tomó. Es un documento **fechado**: no se reescribe. Si la decisión cambia, se escribe un ADR
nuevo que la sustituye y el viejo pasa a estado *Sustituido por ADR-NNN*.

Formato: [MADR 4.0](https://adr.github.io/madr/) reducido, ver [`template.md`](template.md).

## Estados

`Propuesto` → `Aceptado` | `Rechazado` · `Aceptado` → `Obsoleto` | `Sustituido por ADR-NNN`

## Índice

| ID | Decisión | Estado | Fecha |
|---|---|---|---|
| [ADR-001](ADR-001-eleccion-herramienta-ia.md) | Antigravity como herramienta de IA principal | Aceptado | 2026-09-18 |
| [ADR-002](ADR-002-base-de-datos.md) | SQLite como motor de base de datos | Aceptado | 2026-09-18 |
| [ADR-003](ADR-003-inmutabilidad-movimientos.md) | Movimientos inmutables; correcciones por ajuste | Aceptado | 2026-09-18 |
| [ADR-004](ADR-004-minimo-por-producto-y-bodega.md) | Mínimo de inventario por producto **y** bodega | Aceptado | 2026-09-18 |
| [ADR-005](ADR-005-descuento-al-despachar.md) | Inventario se descuenta al confirmar despacho, no al crear pedido | Aceptado | 2026-09-18 |
| [ADR-006](ADR-006-asignacion-manual-de-bodegas.md) | Asignación manual de bodegas en el despacho | Aceptado | 2026-09-18 |
| [ADR-007](ADR-007-despachos-parciales.md) | Despachos parciales permitidos | Aceptado | 2026-09-18 |
| [ADR-008](ADR-008-identificacion-de-productos.md) | ID interno + SKU único | Aceptado | 2026-09-18 |
| [ADR-009](ADR-009-cantidades-enteras.md) | Cantidades enteras positivas | Aceptado | 2026-09-18 |
| [ADR-010](ADR-010-sin-usuarios-ni-permisos.md) | Sin autenticación ni permisos por bodega en v1 | **Sustituido por ADR-015** | 2026-09-18 |
| [ADR-011](ADR-011-api-sin-frontend.md) | API REST sin frontend en v1 | **Sustituido por ADR-013** | 2026-09-18 |
| [ADR-012](ADR-012-servicios-de-dominio.md) | Reglas de negocio en servicios de dominio | Aceptado | 2026-09-18 |
| [ADR-013](ADR-013-frontend-estatico.md) | Frontend estático en `public/` servido por Express | Aceptado | 2026-09-18 |
| [ADR-014](ADR-014-tipo-ajuste.md) | Tipo `AJUSTE` con sentido y motivo obligatorio | Aceptado | 2026-09-18 |
| [ADR-015](ADR-015-roles-usuarios-y-limite-bodegas.md) | Roles supervisor mayor/menor, JWT, límite de 3 bodegas y balanceo sugerido | Aceptado | 2026-09-19 |
| [ADR-016](ADR-016-despliegue-en-render.md) | Despliegue de StockFlow en Render (Web Service unificado y gestión de SQLite efímero) | Aceptado | 2026-09-20 |

ADR-004 a ADR-010 formalizan las asunciones AS-001 a AS-008 de
[`../../ASSUMPTIONS.md`](../../ASSUMPTIONS.md); el análisis largo de alternativas del que salieron
está congelado en [`../_archivo/2026-09-18-analisis-asunciones.md`](../_archivo/2026-09-18-analisis-asunciones.md).

## Cómo añadir uno

1. Copiar `template.md` a `ADR-NNN-<slug>.md` con el siguiente número libre.
2. Rellenar contexto, alternativas y consecuencias. Estado inicial `Propuesto`.
3. Sumar la fila a este índice.
4. Al aceptarlo: cambiar estado, y reflejar la decisión en el doc de estado que toque
   (`../01-arquitectura.md`, `../02-dominio.md`) con enlace al ADR.
