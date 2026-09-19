# Diseño — v1 completa: servicios de dominio, tests N1, cierre de pendientes y frontend

**Fecha:** 2026-09-18 · **Estado:** aprobado por la autora en sesión · **Plan:** [`../plans/2026-09-18-v1-completa.md`](../plans/2026-09-18-v1-completa.md)

Cierra `D-01..D-10`, `Q-01`, `Q-02` de [06-pendientes](../../06-pendientes.md). Decisiones con
alternativas en [ADR-012](../../adr/ADR-012-servicios-de-dominio.md),
[ADR-013](../../adr/ADR-013-frontend-estatico.md), [ADR-014](../../adr/ADR-014-tipo-ajuste.md).

## 1 · Objetivo

Que el sistema cumpla **demostrablemente** R1–R4 y la consulta obligatoria del
[enunciado](../../08-enunciado.md), con una interfaz sencilla que el evaluador pueda usar sin
`curl`, y con una suite que lo pruebe. Sin sobre-ingeniería: lo pedido y nada más.

## 2 · Arquitectura resultante

```
public/                 frontend estático: index.html, app.js, estilos.css
src/
  servicios/
    errores.js          ErrorDeNegocio (→400), NoEncontrado (→404)
    validaciones.js     validarCantidad(valor, nombreCampo)
    inventario.js       registrarMovimiento, fijarMinimo, listarExistencias, auditar
    pedidos.js          crearPedido, despachar, cancelar
  controllers/          solo HTTP: parsear body → llamar servicio → responder; un manejador de errores común
  routes/index.js       rutas existentes + auditoria, minimo, cancelar
  models/               igual + AJUSTE en ENUM + sentido + índice único
  database.js           storage desde DB_STORAGE (default fichero; tests ':memory:')
index.js                express.static('public') + /api
seed.js                 existencias creadas SOLO vía registrarMovimiento(ENTRADA) + fijarMinimo
tests/                  node:test + supertest
```

Manejo de errores: middleware `manejarErrores(err, req, res, next)` al final de `index.js`:
`ErrorDeNegocio` → 400, `NoEncontrado` → 404, resto → 500 con `{ error }`. Los controladores
no hacen `try/catch`; son `async` envueltos por un `capturar(fn)`.

## 3 · Reglas de dominio (contrato de los servicios)

### `validarCantidad(valor, campo)`
Lanza `ErrorDeNegocio` si no es entero o ≤ 0. Única implementación (D-08).

### `registrarMovimiento({ tipo, producto_id, bodega_origen_id, bodega_destino_id, cantidad, notas, sentido })`
- `tipo ∈ {ENTRADA, SALIDA, TRASLADO, AJUSTE}`; `sentido ∈ {ENTRADA, SALIDA}` obligatorio solo en AJUSTE; `notas` obligatorio en AJUSTE (ADR-014).
- Producto inexistente → `NoEncontrado`. Bodega inexistente → `NoEncontrado`.
- Descontinuado: rechaza `ENTRADA` y `AJUSTE` con `sentido=ENTRADA` (R4).
- `TRASLADO` exige origen ≠ destino.
- Toda operación en una transacción; `ajustarExistencia` lanza `ErrorDeNegocio("Existencia insuficiente…")` si quedaría negativo (R1, D-05).
- Devuelve el movimiento creado.

### `fijarMinimo(producto_id, bodega_id, minimo)` (D-09)
`minimo` entero ≥ 0. Crea la fila con `cantidad_actual: 0` si no existe. Devuelve la fila.

### `listarExistencias()`
Igual que hoy: `bajo_minimo = cantidad_actual < minimo`.

### `auditar()` (D-01, R3)
Por cada fila de existencias: `saldo_materializado = cantidad_actual`;
`saldo_historia = Σ(ENTRADA, TRASLADO como destino, AJUSTE·ENTRADA) − Σ(SALIDA, TRASLADO como origen, AJUSTE·SALIDA)`;
`cuadra = saldo_materializado === saldo_historia`. Devuelve `{ filas, total, descuadradas }`.

### `crearPedido({ descripcion, items })` (D-07)
Valida **todos** los ítems (producto existe, cantidad válida) **antes** de insertar; pedido e
ítems en una transacción. Ítem inválido → nada persiste.

### `despachar(pedido_id, despachos)`
Como hoy, pero: usa `validarCantidad`, reusa `ajustarExistencia`, errores tipados. Pedido
`COMPLETADO`/`CANCELADO` → `ErrorDeNegocio`.

### `cancelar(pedido_id)` (D-04)
Solo desde `PENDIENTE` o `PARCIALMENTE_DESPACHADO`; no toca existencias ni crea movimientos
(lo despachado ya salió y queda en la historia). Devuelve el pedido.

## 4 · API (deltas)

| Método | Ruta | Cambio |
|---|---|---|
| POST | `/api/movimientos` | acepta `tipo: AJUSTE` + `sentido`; 400 en existencia insuficiente |
| GET | `/api/inventario/auditoria` | **nuevo** |
| PUT | `/api/inventario/existencias/:producto_id/:bodega_id/minimo` | **nuevo**, body `{ minimo }` |
| POST | `/api/pedidos/:id/cancelar` | **nuevo** |
| GET | `/` | ahora sirve `public/index.html`; el mapa JSON pasa a `GET /api` |

## 5 · Modelo (deltas)

- `Movimiento.tipo` ENUM + `AJUSTE`; campo `sentido` ENUM(`ENTRADA`,`SALIDA`) nulable (solo AJUSTE).
- `ExistenciaPorBodega`: `indexes: [{ unique: true, fields: ['producto_id','bodega_id'] }]` (D-10).
- Sin migraciones (SQLite de demo, `sync`): documentado como excepción vigente.

## 6 · Seed (D-02)

Mismas 3 bodegas y 5 productos. Las 10 existencias se crean con `registrarMovimiento(ENTRADA)`
(el teclado descontinuado se crea ACTIVO, recibe su entrada y **después** se descontinúa), los
mínimos con `fijarMinimo`. Luego el traslado y la salida de ejemplo como movimientos reales.
Resultado: `auditar()` → `descuadradas: 0`; la consulta obligatoria sigue dando 4 bajo mínimo
(las cantidades finales se eligen para conservar ese resultado).

## 7 · Frontend (ADR-013)

`public/index.html` + `app.js` + `estilos.css`. Sin framework, sin build, sin dependencias.
Pestañas: **Existencias** (default; filas bajo mínimo resaltadas; filtro por bodega; editar
mínimo inline) · **Movimientos** (formulario que muestra origen/destino/sentido según tipo;
historial) · **Pedidos** (crear con ítems dinámicos; lista; despachar con filas bodega+cantidad
por ítem; cancelar) · **Auditoría** (tabla con ✔/✘ y contador de descuadradas) · **Catálogo**
(productos: crear/descontinuar; bodegas: crear).

Comportamiento común: cada acción hace `fetch`, recarga la pestaña, y muestra `error` de la API
en un banner. Selects de producto/bodega se cargan una vez al abrir y tras crear. Nada más.

## 8 · Tests (N1)

`tests/` con `node:test` + `supertest`; `DB_STORAGE=:memory:` y `sequelize.sync({ force: true })`
en `before` de cada fichero; datos mínimos creados por la API en cada test.

Orden obligatorio: primero **caracterización** del comportamiento actual (antes de tocar
código), luego un test rojo por cada cambio.

Casos mínimos (Dado / Cuando / Entonces):

- R1: traslado 30 de A a B → A−30, B+30, un movimiento TRASLADO. Traslado 99 con 5 → 400, saldos intactos, sin movimiento.
- R4: ENTRADA a descontinuado → 400; SALIDA a descontinuado → 201; AJUSTE·ENTRADA a descontinuado → 400.
- R2: pedido de 100 despachado 50+50 desde dos bodegas → `PARCIALMENTE_DESPACHADO` si queda otro ítem, `COMPLETADO` si no; dos SALIDA con nota del pedido.
- R3: tras seed + operaciones, `auditoria.descuadradas === 0`; si se altera `cantidad_actual` por SQL directo, la fila sale `cuadra: false`.
- Consulta obligatoria: `bajo_minimo` true solo si `<`; igual al mínimo → false.
- D-07: pedido con ítem inválido → 400 y `GET /api/pedidos` vacío.
- D-08: cantidad `1.5` en ítem y en despacho → 400.
- D-09: PUT mínimo crea fila y la consulta la muestra.
- D-04: cancelar PENDIENTE → CANCELADO; cancelar COMPLETADO → 400; despachar CANCELADO → 400.
- AJUSTE sin `notas` → 400; AJUSTE·SALIDA que deja negativo → 400.
- Frontend: `GET /` → 200 `text/html`; `GET /api` → JSON.

Lint: ESLint flat config `js.configs.recommended`, sin Prettier. `npm run verify` = `lint && test`.

## 9 · Fuera de alcance (explícito)

Autenticación · reservas · asignación automática · migraciones versionadas · tests de browser ·
paginación · cualquier estilo más allá de legible.

## 10 · Criterios de terminado

`npm run verify` verde con salida vista · los `curl` del runbook dan lo documentado · demo
manual V-01 recorrida en el frontend · docs 01/02/04/05 al día, 06 podado, 07 con entrada,
ADR-012/013/014 aceptados, bitácora sesión 3.
