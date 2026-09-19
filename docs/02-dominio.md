# 02 — Dominio y API

Qué hace el sistema **hoy**, verificado contra el código y con `curl` el 2026-09-18.
Requisitos literales en [08-enunciado](08-enunciado.md); decisiones en [`adr/`](adr/README.md).

## Trazabilidad enunciado → implementación

| Requisito | Cómo se cumple | Estado |
|---|---|---|
| Entidad Producto | `Producto` ([ADR-008](adr/ADR-008-identificacion-de-productos.md)) | ✅ |
| Entidad Bodega | `Bodega` | ✅ |
| Existencia por bodega | `ExistenciaPorBodega` con `minimo` por par ([ADR-004](adr/ADR-004-minimo-por-producto-y-bodega.md)) | ✅ |
| Movimiento entrada/salida/traslado (+ ajuste) | `Movimiento.tipo ∈ {ENTRADA, SALIDA, TRASLADO, AJUSTE}` ([ADR-014](adr/ADR-014-tipo-ajuste.md)) | ✅ |
| Pedido | `Pedido` + `ItemPedido` | ✅ |
| **R1** traslado descuenta/suma, nunca negativo | `servicios/inventario.registrarMovimiento`, transacción; existencia insuficiente → `ErrorDeNegocio` (400) | ✅ |
| **R2** despacho desde varias bodegas | `servicios/pedidos.despachar` acepta N despachos por ítem ([ADR-006](adr/ADR-006-asignacion-manual-de-bodegas.md)) | ✅ |
| **R3** saldo reconstruible sumando la historia | `servicios/inventario.auditar()` vía `GET /api/inventario/auditoria`; compara `cantidad_actual` contra Σ movimientos por bodega. El seed crea existencias solo a través de `registrarMovimiento` | ✅ |
| **R4** descontinuado: salidas sí, entradas no | `registrarMovimiento` rechaza `ENTRADA` y `AJUSTE`·`sentido=ENTRADA` con 400 ([ADR-014](adr/ADR-014-tipo-ajuste.md)) | ✅ |
| Consulta obligatoria | `GET /api/inventario/existencias` con `bajo_minimo` | ✅ |

## Reglas adicionales decididas (no exigidas por el enunciado)

- Descuento al despachar, no al crear pedido — [ADR-005](adr/ADR-005-descuento-al-despachar.md).
- Despachos parciales con estados — [ADR-007](adr/ADR-007-despachos-parciales.md).
- Cantidades enteras positivas — [ADR-009](adr/ADR-009-cantidades-enteras.md).
- Sin usuarios ni permisos — [ADR-010](adr/ADR-010-sin-usuarios-ni-permisos.md).
- Origen ≠ destino en un traslado (400 si coinciden).
- Un despacho solo puede referenciar ítems del propio pedido (404 si no).
- Pedido `COMPLETADO` o `CANCELADO` no admite más despachos ni cancelación (400).
- `AJUSTE` exige `sentido` y `notas` con el motivo (400 si faltan) — [ADR-014](adr/ADR-014-tipo-ajuste.md).
- Mínimo fijable por la API sin pasar por el seed — `PUT /api/inventario/existencias/:producto_id/:bodega_id/minimo`.
- Pedido cancelable desde `PENDIENTE` o `PARCIALMENTE_DESPACHADO`; cancelar no revierte lo ya despachado.
- Un pedido admite productos `DESCONTINUADO` (R4 solo restringe entradas) y líneas repetidas del mismo producto.

## Ciclo de vida del pedido

```
crear ──► PENDIENTE ──despacho parcial──► PARCIALMENTE_DESPACHADO ──despacho final──► COMPLETADO
   │                       │
   └──────── POST /api/pedidos/:id/cancelar ────────► CANCELADO
                       └──────────── despacho que completa todo ─────────────────────┘
```

Estado recalculado al final de cada `servicios/pedidos.despachar`: todos los ítems completos →
`COMPLETADO`; alguno con `cantidad_despachada > 0` → `PARCIALMENTE_DESPACHADO`; si no,
`PENDIENTE`. `CANCELADO` se alcanza con `servicios/pedidos.cancelar` desde `PENDIENTE` o
`PARCIALMENTE_DESPACHADO`; `COMPLETADO`/`CANCELADO` son estados finales.

## API

Prefijo **`/api`** en todas las rutas (`src/app.js` monta el router ahí). `GET /` sirve la
interfaz web (`public/index.html`); el mapa JSON de endpoints pasa a `GET /api`.

| Método | Ruta | Controlador | Body / notas |
|---|---|---|---|
| GET | `/api/productos` | `productosController.listar` | — |
| GET | `/api/productos/:id` | `productosController.obtener` | 404 si no existe |
| POST | `/api/productos` | `productosController.crear` | `{ sku, nombre, descripcion?, estado? }` · 400 si SKU repetido |
| PATCH | `/api/productos/:id/descontinuar` | `productosController.descontinuar` | sin body |
| GET | `/api/bodegas` | `bodegasController.listar` | — |
| POST | `/api/bodegas` | `bodegasController.crear` | `{ nombre, ubicacion? }` |
| GET | `/api/movimientos` | `movimientosController.listar` | historial completo, más nuevo primero |
| POST | `/api/movimientos` | `movimientosController.registrar` | `{ tipo, producto_id, bodega_origen_id?, bodega_destino_id?, cantidad, notas?, sentido? }` · `sentido` obligatorio solo en `AJUSTE` |
| GET | `/api/inventario/existencias` | `inventarioController.existencias` | **consulta obligatoria** |
| GET | `/api/inventario/auditoria` | `inventarioController.auditoria` | **R3**: saldo materializado vs. suma de la historia |
| PUT | `/api/inventario/existencias/:producto_id/:bodega_id/minimo` | `inventarioController.fijarMinimo` | `{ minimo }`, crea la fila si no existe |
| GET | `/api/pedidos` | `pedidosController.listar` | con ítems |
| POST | `/api/pedidos` | `pedidosController.crear` | `{ descripcion?, items: [{ producto_id, cantidad_solicitada }] }` |
| POST | `/api/pedidos/:id/despachar` | `pedidosController.despachar` | `{ despachos: [{ item_pedido_id, bodega_id, cantidad }] }` |
| POST | `/api/pedidos/:id/cancelar` | `pedidosController.cancelar` | sin body; solo desde `PENDIENTE`/`PARCIALMENTE_DESPACHADO` |

No existe `DELETE` para ningún recurso. Ejemplos ejecutables en [05-runbook](05-runbook.md).

### Respuesta de la consulta obligatoria

```json
{
  "producto_id": 1, "bodega_id": 1,
  "producto": "Papel Resma A4", "sku": "PAP-001", "estado_producto": "ACTIVO",
  "bodega": "Bodega Norte", "ubicacion": "Calle 80 # 15-20",
  "cantidad_actual": 50, "minimo": 100, "bajo_minimo": true
}
```

`bajo_minimo = cantidad_actual < minimo` (estrictamente menor: igual al mínimo **no** alerta).
Ordenada por nombre de producto y luego de bodega.

## Interfaz (`public/`)

`GET /` sirve una página con cinco pestañas (sin framework, sin build; [ADR-013](adr/ADR-013-frontend-estatico.md)):

- **Existencias** (por defecto): tabla con filas bajo mínimo resaltadas, filtro por bodega,
  edición de mínimo inline.
- **Movimientos**: formulario que muestra origen/destino/sentido según `tipo`; historial.
- **Pedidos**: crear con ítems dinámicos, listar, despachar (filas bodega + cantidad por ítem),
  cancelar.
- **Auditoría**: tabla de `GET /api/inventario/auditoria` con contador de descuadradas.
- **Catálogo**: productos (crear/descontinuar) y bodegas (crear).

Cada acción hace `fetch` a `/api`, recarga su pestaña y muestra el `error` de la API en un
banner; la UI no valida reglas de negocio por su cuenta ([04-convenciones](04-convenciones.md)).

## Datos de demo (`npm run seed`)

3 bodegas (Norte, Sur, Central) · 5 productos, `TEC-005` descontinuado (recibe su entrada y
**luego** se marca `DESCONTINUADO`) · 10 existencias, **4 bajo mínimo** (PAP-001 Norte, TON-002
Central, CAB-003 Central, MOU-004 Sur) · las 10 existencias se crean **solo** vía
`registrarMovimiento(ENTRADA)` + `fijarMinimo` (D-02), más 1 traslado y 1 salida de ejemplo → 11
movimientos en total · 1 pedido `PENDIENTE` con 2 ítems. `servicios/inventario.auditar()` da
`descuadradas: 0` tras el seed. El seed (`cargarDatosDemo` en `seed.js`) **borra y recrea** todas
las tablas.
