# 05 — Runbook

Comandos y procedimientos. Copiar y pegar sin pensar. Si un comando cambia, se cambia acá el
mismo día. Todo verificado el 2026-09-18 con Node v24.11.1 en Windows 11.

## Levantar desde cero

```bash
npm install          # dependencias (express, sequelize, sqlite3, eslint, supertest…)
npm run seed         # BORRA y recrea stockflow.sqlite con datos de demo
npm start            # http://localhost:3000  (PORT opcional) — abre la UI en el navegador
npm run dev          # igual, con --watch
```

Variables: `PORT` (default 3000) y `DB_STORAGE` (ruta relativa a la raíz o `:memory:`; los tests la
ponen a `:memory:`). Se leen de `.env` en la raíz vía `dotenv` (`src/config.js`); plantilla en
`.env.example`. `.env` no se commitea.

## Pipeline (`npm run verify`)

```bash
npm run lint       # ESLint flat config
npm test           # node:test + supertest
npm run test:cov   # c8 sobre src/** y seed.js, con umbral
npm run verify     # lint && test:cov — obligatorio antes de commitear
```

Baseline 2026-09-18, cierre de opcionales (salida real de `npm run test:cov`; resumen, no la
tabla completa por archivo — está en la consola al correrlo; lista completa de casos en
[07-historial](07-historial.md)):

```
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

=============================== Coverage summary ===============================
Statements   : 98.59% ( 979/993 )
Branches     : 89.7% ( 183/204 )
Functions    : 100% ( 30/30 )
Lines        : 98.59% ( 979/993 )
================================================================================
```

Umbrales exigidos por `npm run test:cov`: líneas 90 %, funciones 90 %, ramas 80 %, sentencias
90 % — todos superados por el real de arriba, así que no hubo que bajarlos.

Arranque manual: `npm run seed && npm start` en < 3 s; `GET /` → 200 `text/html`;
`GET /api/inventario/existencias` devuelve 10 filas, 4 con `bajo_minimo: true`.

## Peticiones de demo (defensa oral)

IDs según el seed: bodegas 1 Norte · 2 Sur · 3 Central; productos 1 PAP-001 · 2 TON-002 ·
3 CAB-003 · 4 MOU-004 · 5 TEC-005 (descontinuado); pedido 1 con ítems 1 (PAP×100) y 2 (MOU×20).

Misma secuencia importable en Postman/Bruno: [`stockflow.postman_collection.json`](stockflow.postman_collection.json).

```bash
# R1 — traslado OK (Sur → Norte, 30 resmas) → 201
curl -s -X POST localhost:3000/api/movimientos -H 'content-type: application/json' \
  -d '{"tipo":"TRASLADO","producto_id":1,"bodega_origen_id":2,"bodega_destino_id":1,"cantidad":30}'

# R1 — traslado que dejaría negativo → 400
curl -s -X POST localhost:3000/api/movimientos -H 'content-type: application/json' \
  -d '{"tipo":"TRASLADO","producto_id":2,"bodega_origen_id":3,"bodega_destino_id":1,"cantidad":999}'

# R4 — entrada a descontinuado → 400
curl -s -X POST localhost:3000/api/movimientos -H 'content-type: application/json' \
  -d '{"tipo":"ENTRADA","producto_id":5,"bodega_destino_id":1,"cantidad":1}'

# R4 — salida de descontinuado → 201
curl -s -X POST localhost:3000/api/movimientos -H 'content-type: application/json' \
  -d '{"tipo":"SALIDA","producto_id":5,"bodega_origen_id":1,"cantidad":2}'

# AJUSTE — corrección de conteo (suma 5 en Bodega Norte, motivo obligatorio) → 201
curl -s -X POST localhost:3000/api/movimientos -H 'content-type: application/json' \
  -d '{"tipo":"AJUSTE","sentido":"ENTRADA","producto_id":1,"bodega_destino_id":1,"cantidad":5,"notas":"conteo fisico"}'

# D-01/R3 — auditoría: descuadradas debe dar 0 tras el seed
curl -s localhost:3000/api/inventario/auditoria

# D-09 — fijar mínimo sin pasar por el seed
curl -s -X PUT localhost:3000/api/inventario/existencias/1/1/minimo -H 'content-type: application/json' \
  -d '{"minimo":200}'

# R2 — despacho multibodega del ítem 1 (100 resmas: 50 Norte + 50 Sur) → PARCIALMENTE_DESPACHADO
curl -s -X POST localhost:3000/api/pedidos/1/despachar -H 'content-type: application/json' \
  -d '{"despachos":[{"item_pedido_id":1,"bodega_id":1,"cantidad":50},{"item_pedido_id":1,"bodega_id":2,"cantidad":50}]}'

# completar el ítem 2 → COMPLETADO
curl -s -X POST localhost:3000/api/pedidos/1/despachar -H 'content-type: application/json' \
  -d '{"despachos":[{"item_pedido_id":2,"bodega_id":1,"cantidad":20}]}'

# D-04 — cancelar un pedido nuevo (PENDIENTE → CANCELADO)
curl -s -X POST localhost:3000/api/pedidos -H 'content-type: application/json' \
  -d '{"descripcion":"prueba cancelar","items":[{"producto_id":1,"cantidad_solicitada":1}]}'
curl -s -X POST localhost:3000/api/pedidos/2/cancelar   # ajustar el id al que devolvió el POST anterior

# R3 — historial de movimientos
curl -s localhost:3000/api/movimientos
```

Todos verificados con `curl` el 2026-09-18 contra un servidor recién sembrado: cada código de
estado coincide con lo documentado arriba. Para repetir la demo desde cero: `npm run seed`
otra vez (o usar la UI en `http://localhost:3000/`).

## Base de datos

Fichero `stockflow.sqlite` en la raíz. Inspección rápida sin instalar nada:

```bash
node -e "const s=require('./src/database');s.query('SELECT tipo,producto_id,bodega_origen_id,bodega_destino_id,cantidad FROM movimientos').then(([r])=>{console.table(r);process.exit()})"
```

Sin migraciones: cualquier cambio de modelo → `npm run seed` (pierde datos).

## Gotchas operativos

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `GET /productos` → 404 | Todas las rutas de la API cuelgan de `/api` | Usar `/api/productos` |
| Al reseedear, el navegador muestra datos viejos en una pestaña abierta | El frontend no refresca solo | Recargar la página tras `npm run seed` |
