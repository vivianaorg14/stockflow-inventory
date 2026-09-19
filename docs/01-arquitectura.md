# 01 — Arquitectura

Estado técnico **actual**, verificado contra el código el 2026-09-18. Las decisiones con
alternativas viven en [`adr/`](adr/README.md); acá solo se enlazan.

## Stack

| Capa | Tecnología | Decisión |
|---|---|---|
| Runtime | Node.js (probado con v24.11.1; README exige ≥ 18) | — |
| HTTP | Express 4 | — |
| ORM | Sequelize 6 | [ADR-002](adr/ADR-002-base-de-datos.md) |
| Base de datos | SQLite, fichero `stockflow.sqlite` en la raíz (ignorado por git) | [ADR-002](adr/ADR-002-base-de-datos.md) |
| Frontend | Estático en `public/` (`index.html` + `app.js` + `estilos.css`), servido por Express | [ADR-013](adr/ADR-013-frontend-estatico.md), sustituye a [ADR-011](adr/ADR-011-api-sin-frontend.md) |
| Tests | `node:test` + `supertest`, 42 casos en `tests/` | `npm test` |
| Lint | ESLint flat config (`eslint.config.js`) | `npm run lint` |
| Cobertura | `c8` sobre `src/**` y `seed.js`; umbrales 90 % líneas/funciones/sentencias, 80 % ramas | `npm run test:cov` |
| Type-check | No existe | N2 — no planificado |

Sin Docker. Configuración en `src/config.js` (carga `.env` con `dotenv`; `PORT` y `DB_STORAGE`,
ninguna obligatoria).

## Capas

```
index.js                 arranque: sincroniza y hace app.listen()
src/app.js               construye la app Express: json(), estáticos de public/, /api, GET /api, manejarErrores
src/routes/index.js      un router; cada ruta → una función de controlador
src/controllers/*.js     solo HTTP: parsea el body, llama al servicio, responde (capturar())
src/servicios/*.js       reglas de negocio (inventario.js, pedidos.js, validaciones.js, errores.js)
src/models/*.js          modelos Sequelize; index.js define relaciones y exporta sincronizar()
src/config.js            carga .env (dotenv) y resuelve puerto y storage
src/database.js          instancia Sequelize (storage desde config; ':memory:' en tests)
public/*                 frontend estático (index.html, app.js, estilos.css)
seed.js                  cargarDatosDemo(): sync({ force: true }) + datos de demo
```

Las reglas del enunciado viven en `src/servicios/inventario.js` y `src/servicios/pedidos.js`;
los controladores no contienen lógica de negocio ([ADR-012](adr/ADR-012-servicios-de-dominio.md)).
Errores de dominio (`ErrorDeNegocio`, `NoEncontrado`) se traducen a HTTP en un único sitio: el
middleware `manejarErrores` de `src/app.js`.

## Modelo de datos

Seis tablas (`sequelize.sync`, sin migraciones versionadas):

| Tabla | Modelo | Notas |
|---|---|---|
| `productos` | `Producto` | `sku` único; `estado ∈ {ACTIVO, DESCONTINUADO}` |
| `bodegas` | `Bodega` | `nombre`, `ubicacion` |
| `existencias_por_bodega` | `ExistenciaPorBodega` | par (`producto_id`,`bodega_id`) + `cantidad_actual` + `minimo` |
| `movimientos` | `Movimiento` | `tipo ∈ {ENTRADA, SALIDA, TRASLADO, AJUSTE}`, `sentido ∈ {ENTRADA, SALIDA}` nulable (solo `AJUSTE`, [ADR-014](adr/ADR-014-tipo-ajuste.md)), `bodega_origen_id` / `bodega_destino_id` nulables, `cantidad`, `notas`. Fecha = `createdAt` |
| `pedidos` | `Pedido` | `estado ∈ {PENDIENTE, PARCIALMENTE_DESPACHADO, COMPLETADO, CANCELADO}` |
| `items_pedido` | `ItemPedido` | `cantidad_solicitada`, `cantidad_despachada` |

Nombres de tabla exactos: ver `tableName` en cada modelo. Relaciones en `src/models/index.js`.

## Invariantes y dónde se hacen cumplir

| Regla | Dueño de código | Mecanismo |
|---|---|---|
| Existencia nunca negativa | `servicios/inventario.ajustarExistencia` | comprobación antes de `update`, dentro de transacción; lanza `ErrorDeNegocio` |
| Traslado atómico origen/destino | `servicios/inventario.registrarMovimiento` | una `sequelize.transaction()` |
| Descontinuado sin entradas (ni por `AJUSTE`) | `servicios/inventario.registrarMovimiento` | `ErrorDeNegocio` si `producto.estado === 'DESCONTINUADO'` y el efecto es de entrada |
| Movimientos inmutables | `src/routes/index.js` | no existe `PUT`/`DELETE /movimientos` ([ADR-003](adr/ADR-003-inmutabilidad-movimientos.md)) |
| Cantidad entera > 0 | `servicios/validaciones.validarCantidad` | única implementación, reusada por movimientos, pedidos y despachos |
| Despacho ≤ pendiente | `servicios/pedidos.aplicarDespacho` (vía `despachar`) | `ErrorDeNegocio` si `cantidad > solicitada − despachada` |
| Par (`producto_id`,`bodega_id`) único | `ExistenciaPorBodega` | índice único de base de datos |

**Nota de diseño:** `cantidad_actual` es un **saldo materializado** que se actualiza con cada
movimiento; no se recalcula desde `movimientos` en cada lectura. R3 del enunciado
("reconstruir sumando la historia") lo cumple `servicios/inventario.auditar()`, que compara ese
saldo contra la suma de `movimientos` fila por fila y expone el resultado en
`GET /api/inventario/auditoria`.

## Manejo de errores

Middleware único `manejarErrores` (`src/controllers/http.js`, montado al final de `src/app.js`):
`ErrorDeNegocio` → 400, `NoEncontrado` → 404, `SequelizeValidationError` → 400, un JSON
malformado (`err.status` que pone `body-parser`) → ese mismo código, cualquier otra excepción →
500 con `{ error: mensaje }`. Los controladores no hacen `try/catch`; están envueltos por
`capturar(fn)`, que reenvía el rechazo a `next`.
