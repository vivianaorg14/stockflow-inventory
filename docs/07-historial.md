# 07 — Historial

Changelog por hito: **qué** cambió · **por qué** · **cómo revertir**. Fechas absolutas, lo
más nuevo arriba. No es una crónica de sesiones (eso, en lo que toca a IA, va en
[`../BITACORA-IA.md`](../BITACORA-IA.md)): se registra el cambio y la lección. El detalle
commit-a-commit está en `git log`.

Cuando este archivo pasa de ~600 líneas, las entradas viejas se mueven a
`_archivo/historial-hasta-AAAA-MM-DD.md` y queda el puntero acá.

---

## 2026-09-18 — Cierre de opcionales

**Qué:** ejecución de [`superpowers/notes/2026-09-18-cierre-opcionales.md`](superpowers/notes/2026-09-18-cierre-opcionales.md),
cerrando toda la deuda menor y de calidad que quedaba abierta salvo `DOC-01` (de la autora),
con TDD (test rojo → cambio → verde) en cada ítem de comportamiento:

- **M-02** (`public/app.js`): `f.estado_producto`, `m.tipo`, `p.estado` (producto y pedido) y el
  atributo `class="estado ${p.estado}"` ahora pasan por `escapar()` en `renderizarExistencias`,
  `renderizarMovimientos`, `renderizarPedidos` y `renderizarCatalogo`. Edición cuidadosa, sin
  test automático (no hay harness de UI); verificado leyendo el código y con la suite existente
  (nada de HTML se rompió).
- **M-03** (`public/index.html`): `<link rel="icon" href="data:,">` en el `<head>` para que el
  navegador no pida `favicon.ico` y reciba 404. Test nuevo en `tests/arranque.test.js`.
- **M-04** (`src/servicios/pedidos.js`, `aplicarDespacho`): `item_pedido_id` se valida con
  `validarId` (ya existente) antes del `find`, y la comparación usa el número validado. Un
  `item_pedido_id` en string (`"1"`) ahora despacha igual que el número; uno no numérico
  (`"abc"`) responde 400 en vez del 404 equivocado que daba antes. Dos tests nuevos en
  `tests/pedidos.test.js`.
- **M-05** (`src/servicios/validaciones.js`, `aEntero`): `typeof valor === 'boolean'` se rechaza
  explícitamente antes de `Number(valor)`, así que `true`/`false` ya no cuelan como `1`/`0` en
  `validarCantidad`, `validarEnteroNoNegativo` ni `validarId`. Test nuevo en
  `tests/validaciones.test.js`.
- **M-06** (`seed.js`, `cargarDatosDemo`): ahora acepta un `registrar` opcional (`() => {}` por
  defecto) y reporta 5 mensajes de progreso (bodegas, productos, existencias, traslado/salida de
  ejemplo, pedido de prueba). El bloque `require.main === module` le pasa `console.log`; los
  tests siguen llamando `cargarDatosDemo()` sin argumentos y quedan silenciosos. Test nuevo en
  `tests/seed.test.js`.
- **Q-03** (cobertura con umbral, N2): `c8@^10` como única dependencia nueva (dev). Scripts
  `test:cov` (`c8` sobre `src/**` y `seed.js`, con `--include` **entre comillas dobles** — con
  comillas simples `npm run` en Windows las pasa literales al no usar shell POSIX y `c8` no
  encuentra ningún archivo, cobertura sale en `0/0`) y `verify` (`lint && test:cov`). Umbrales
  pedidos: líneas 90 %, funciones 90 %, ramas 80 %, sentencias 90 %; la suite de 42 casos los
  superó todos sin ayuda (ver salida real en [05-runbook.md](05-runbook.md)), así que no hubo que
  bajar ninguno.
- **DOC-02** (colección de peticiones): `docs/stockflow.postman_collection.json` (Postman v2.1,
  variable `baseUrl`), una petición por cada uno de los 12 `curl` de "Peticiones de demo" de
  `05-runbook.md`, mismo orden y mismos cuerpos, con nombres en español (`R1 — traslado OK`,
  `R4 — entrada a descontinuado (400)`, etc.). Línea añadida en `05-runbook.md` antes de los
  `curl` apuntando al archivo. JSON validado con `node -e "JSON.parse(...)"`.
- Documentación actualizada en el mismo cierre: `04-convenciones.md` (Parte C, nivel N2 con
  comando y umbrales reales), `00-INDEX.md` (calidad N2, trabajo en curso), `01-arquitectura.md`
  (fila "Cobertura" en la tabla de stack), `README.md` (limitaciones + mapa con la colección),
  `BITACORA-IA.md` (sesión 3, una línea sobre este cierre).

**Por qué:** eran los últimos ítems de `06-pendientes.md` con impacto real o de calidad
(prioridad P3 pero acumulada) antes de dejar el repo solo con `DOC-01` abierto, que le
corresponde completar a la autora.

**Evidencia:** `npm run verify` en verde — 42/42 tests, lint sin salida, cobertura 98.59 %
líneas / 89.7 % ramas / 100 % funciones / 98.59 % sentencias contra los umbrales 90/80/90/90.
Detalle en [05-runbook.md](05-runbook.md). Chequeo de enlaces de `docs/` y raíz: 0 rotos
(verificado con un recorrido de todos los enlaces relativos Markdown contra el sistema de
archivos).

**Cómo revertir:**
- `public/app.js` / `public/index.html`: quitar los `escapar()` añadidos en M-02 y la línea
  `<link rel="icon">` de M-03.
- `src/servicios/pedidos.js`: quitar la llamada a `validarId` en `aplicarDespacho` y volver a
  comparar con `despacho.item_pedido_id` sin validar (reintroduce el bug).
- `src/servicios/validaciones.js`: quitar el `if (typeof valor === 'boolean')` de `aEntero`.
- `seed.js`: quitar el parámetro `registrar` y las llamadas `registrar(...)`; volver a
  `cargarDatosDemo()` sin argumentos y a `cargarDatosDemo()` en el bloque CLI.
- `package.json`: quitar `test:cov`, devolver `verify` a `lint && test`, `npm uninstall c8`.
- Borrar `docs/stockflow.postman_collection.json` y la línea que la referencia en
  `05-runbook.md`.

## 2026-09-18 — Ola de fixes de la revisión final

**Qué:** ejecución de [`superpowers/notes/2026-09-18-ola-de-fixes-revision-final.md`](superpowers/notes/2026-09-18-ola-de-fixes-revision-final.md)
(9 fixes + cierre de documentación), con TDD (test rojo → fix → verde) en cada uno:

- `servicios/pedidos.aplicarDespacho` llamaba a `ajustarExistencia` sin validar antes que la
  bodega del despacho existiera: un `bodega_id` inexistente rompía la FK dentro de la
  transacción y salía como 500. Ahora llama a `exigirBodega` (recién exportada desde
  `servicios/inventario.js`) antes de tocar existencias → 404, sin persistir nada.
- `manejarErrores` (`src/controllers/http.js`) solo miraba `err.estado`: un JSON malformado
  (`body-parser` pone `err.status`) o un `SequelizeValidationError` caían al 500 por defecto.
  Ahora: `err.estado || err.status || (err.name === 'SequelizeValidationError' ? 400 : 500)`.
- Ids de ruta no numéricos (`/api/pedidos/abc/cancelar`, `/api/inventario/existencias/abc/1/minimo`)
  llegaban a Sequelize como `NaN` y salían 500. `validarId` nueva en `servicios/validaciones.js`
  (entero ≥ 1) usada en `pedidosController.despachar/cancelar` e
  `inventarioController.fijarMinimo`. De paso: se quitó el guard `if (!bodega_id) return` de
  `exigirBodega` (los dos llamadores en `registrarMovimiento` ahora solo la invocan
  `if (efecto.origen/destino)`), y `resolverEfecto` compara origen/destino con `Number(...)`
  para que `1` y `"1"` cuenten como la misma bodega.
- XSS almacenado en `public/app.js`: `opciones()` interpolaba la etiqueta de cada `<option>` sin
  escapar — un `nombre` de producto o bodega con HTML se ejecutaba en el navegador. Fix de una
  línea: `${escapar(etiqueta(e))}`. Sin test automático (no hay suite de frontend); verificado
  leyendo el código.
- `productosController.js` y `bodegasController.js` migrados a `capturar()` + errores tipados
  (`ErrorDeNegocio`/`NoEncontrado`), sin `try/catch` ni `res.status(500)` a mano — alinea el
  código con [ADR-012](adr/ADR-012-servicios-de-dominio.md) y `docs/01-arquitectura.md`, que ya
  decían que los controladores no tienen lógica de errores propia. Cambio de comportamiento
  observable: `estado` fuera de `{ACTIVO, DESCONTINUADO}` ahora responde 400 (antes se
  persistía tal cual).
- Comentario de cabecera de `src/models/Movimiento.js` actualizado para mencionar `AJUSTE` y
  `sentido` (cierra `M-01`).
- `README.md` y `package.json`: requisito de Node documentado como `≥ 22` (para `npm test`;
  `≥ 18` basta para ejecutar) y `"engines": { "node": ">=22" }` en `package.json`.
- `docs/02-dominio.md`: una línea nueva en "Reglas adicionales" — un pedido admite productos
  `DESCONTINUADO` (R4 solo restringe entradas) y líneas repetidas del mismo producto.
- `docs/05-runbook.md`: se borró la línea obsoleta "No hay `.env`." (contradecía el párrafo de
  arriba, que sí documenta `.env`/`dotenv`).

**Por qué:** hallazgos de la revisión final de la v1 completa: un 500 donde el enunciado exige
400/404 es un defecto de contrato HTTP, no solo cosmético; el XSS almacenado es explotable por
cualquier usuario que cree un producto o bodega con nombre malicioso; la deuda de
`productosController`/`bodegasController` hacía que la documentación (ADR-012, `docs/01`)
describiera un código que no era el real.

**Evidencia:** tests nuevos en `tests/pedidos.test.js` (despacho a bodega inexistente,
id no numérico en cancelar/despachar), `tests/arranque.test.js` (JSON malformado),
`tests/inventario.test.js` (nuevo: id no numérico en fijar mínimo), `tests/validaciones.test.js`
(`validarId`) y `tests/catalogo.test.js` (nuevo: SKU repetido, estado inválido, 404). Cada uno
falló primero (500/201 donde debía dar 400/404, o `validarId is not a function`) y quedó en
verde tras el fix correspondiente. `npm run verify` final:

```
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

(pasó de 29 a 37 casos: 8 tests nuevos — 1 en pedidos.test.js del despacho a bodega inexistente,
2 de ids no numéricos en pedidos, 1 archivo `tests/inventario.test.js` con 1 test, 1 test de
JSON malformado, 1 test de `validarId`, 3 tests en `tests/catalogo.test.js`).

**Cómo revertir:** cada punto es independiente y reversible por separado —
`git diff` (no hay commits aún) contra `src/servicios/pedidos.js`, `src/servicios/inventario.js`,
`src/controllers/http.js`, `src/servicios/validaciones.js`, `src/controllers/pedidosController.js`,
`src/controllers/inventarioController.js`, `public/app.js`, `src/controllers/productosController.js`,
`src/controllers/bodegasController.js`, `src/models/Movimiento.js`, `README.md`, `package.json`,
`docs/02-dominio.md`, `docs/05-runbook.md`, `docs/01-arquitectura.md`; y los tests nuevos en
`tests/pedidos.test.js`, `tests/arranque.test.js`, `tests/inventario.test.js`,
`tests/validaciones.test.js`, `tests/catalogo.test.js`.

## 2026-09-18 — Configuración por `.env` (dotenv)

**Qué:** `src/config.js` carga `.env` con `dotenv@16` y resuelve `PORT` y `DB_STORAGE` (ruta
relativa a la raíz o `:memory:`); `index.js` y `src/database.js` lo consumen. `.env.example` como
plantilla; `.env` en `.gitignore`.

**Por qué:** la autora quería levantar el servidor en otro puerto sin exportar variables a mano.
Dependencia nueva aprobada explícitamente por ella en sesión.

**Evidencia:** `npm test` 29/29 tras el cambio; con `PORT=3002` en `.env`, `npm start` responde en
`http://localhost:3002/api/inventario/existencias` → 200.

**Cómo revertir:** borrar `src/config.js`, `.env`, `.env.example`; en `index.js` volver a
`process.env.PORT || 3000` y en `database.js` a `process.env.DB_STORAGE || path.join(__dirname, '..', 'stockflow.sqlite')`;
`npm uninstall dotenv`.

## 2026-09-18 — v1 completa: servicios de dominio, tests N1, frontend y cierre de pendientes

**Qué:** ejecución completa del plan [`superpowers/plans/2026-09-18-v1-completa.md`](superpowers/plans/2026-09-18-v1-completa.md)
sobre el diseño [`superpowers/specs/2026-09-18-v1-completa-design.md`](superpowers/specs/2026-09-18-v1-completa-design.md):

- Reglas movidas de los controladores a `src/servicios/{inventario,pedidos,validaciones,errores}.js`;
  controladores reducidos a HTTP puro (`capturar` + `manejarErrores`) — [ADR-012](adr/ADR-012-servicios-de-dominio.md).
- Tipo de movimiento `AJUSTE` con `sentido` y `notas` obligatorios — [ADR-014](adr/ADR-014-tipo-ajuste.md).
- `GET /api/inventario/auditoria` (R3: compara saldo materializado contra la suma de la
  historia), `PUT /api/inventario/existencias/:producto_id/:bodega_id/minimo`,
  `POST /api/pedidos/:id/cancelar`.
- Índice único en `existencias_por_bodega(producto_id, bodega_id)`.
- `seed.js` reescrito: las 10 existencias se crean **solo** a través de `registrarMovimiento` +
  `fijarMinimo`, nunca por asignación directa — así la auditoría cuadra desde el primer momento.
- Frontend estático en `public/` (`index.html`, `app.js`, `estilos.css`) con cinco pestañas
  (Existencias, Movimientos, Pedidos, Auditoría, Catálogo); `GET /` lo sirve, el mapa JSON de
  endpoints se movió a `GET /api` — [ADR-013](adr/ADR-013-frontend-estatico.md), sustituye a
  [ADR-011](adr/ADR-011-api-sin-frontend.md).
- Suite `tests/` con `node:test` + `supertest` (29 casos) y ESLint flat config
  (`eslint.config.js`); `npm run verify` = `lint && test`.
- Documentación 01/02/04/05 puesta al día contra el código resultante; 06 podado
  (`D-01..D-10`, `Q-01`, `Q-02`, `V-01` cerrados); ADR-012/013/014 con su evidencia real.

**Por qué:** cerrar la deuda de dominio y de calidad detectada en la sesión anterior
(`D-01..D-10`) y subir el pipeline de "ninguno" a **N1**, con una interfaz que permita demostrar
R1–R4 sin `curl`.

**Evidencia:**

```
$ npm run verify
> eslint .
> node --test --test-reporter=spec tests/**/*.test.js
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Lint sin salida. Los `curl` del runbook (traslado, traslado insuficiente, entrada/salida a
descontinuado, `AJUSTE`, auditoría, fijar mínimo, despacho multibodega, cancelar) se ejecutaron
contra un servidor recién sembrado el 2026-09-18 y devolvieron los códigos documentados en
[05-runbook](05-runbook.md). `auditar()` dio `descuadradas: 0` sobre los datos del seed. Además,
`V-01` (recorrido de las 5 pestañas de la UI) se ejecutó con Playwright (Edge headless) el
2026-09-18: 12/12 checks OK — script en
[`superpowers/notes/2026-09-18-v01-recorrido-ui.playwright.js`](superpowers/notes/2026-09-18-v01-recorrido-ui.playwright.js).

**Cómo revertir:** nada de esto está commiteado (el repo es de la autora; el último commit sigue
siendo `d49e848`). Para volver al estado previo a esta tarea: `git checkout -- . && git clean -fd`
descarta todo lo no commiteado, incluyendo: `src/app.js`, `src/servicios/`, `src/controllers/http.js`,
`src/controllers/pedidosController.js`, `public/`, `tests/`, `eslint.config.js`,
`docs/adr/ADR-012-servicios-de-dominio.md`, `docs/adr/ADR-013-frontend-estatico.md`,
`docs/adr/ADR-014-tipo-ajuste.md`, `docs/superpowers/`. La autora es quien decide qué de todo
esto commitear y en cuántos commits (no se hizo ningún commit desde esta sesión).

**Lección:** un pendiente con evidencia (`D-01`..`D-10`) se ataca mejor con un diseño único
(ADR-012/013/014 + spec) que arreglando uno por uno: varios compartían la misma causa (reglas
sin dueño único, `includes()` sobre texto en vez de errores tipados).

## 2026-09-18 — Reorganización de la documentación y carpeta de ADR

**Qué:** se adoptó la estructura estándar `docs/00–08` + `adr/` + `_archivo/` + `superpowers/`.
`CLAUDE.md` nuevo y `AGENTS.md` reescrito como punteros cortos. Los tres ADR existentes se
movieron a `docs/adr/` sin cambiar su contenido (ADR-003 recibió una nota fechada al pie).
Las ocho asunciones AS-001..008 se formalizaron como ADR-004..010 en formato MADR, más ADR-011
(sin frontend). `StockFlow_Analisis_Asunciones.md` se congeló en `_archivo/`. `README.md`
corregido (rutas con `/api`, basura al final del fichero, enlaces). Sin cambios de código.

**Por qué:** la documentación estaba repartida en cinco ficheros de raíz con contenido
duplicado (ASSUMPTIONS ≈ Análisis largo; entidades en README y AGENTS), y `README` documentaba
rutas que devolvían 404. `AGENTS.md` mezclaba contexto de dominio con log de sesión.

**Evidencia:** `npm install && npm run seed && npm start` arranca; `GET /api/inventario/existencias`
devuelve las 10 filas del seed; `GET /productos` → 404 y `GET /api/productos` → 200. Al probar
se detectaron los defectos `D-05` (500 en vez de 400) y `D-07` (pedido huérfano), registrados
en [06-pendientes](06-pendientes.md). Enlaces de `docs/` comprobados con el script del protocolo.

**Cómo revertir:** los cambios no están commiteados (el repo es de la autora): `git checkout -- . && git clean -fd docs CLAUDE.md` vuelve al commit `d49e848`. Nada del código cambió.

**Lección:** el README v1 se escribió antes del código y nunca se contrastó: documentó
`/productos` cuando `index.js` montaba todo en `/api`. Toda ruta documentada se prueba con `curl`
antes de darla por buena.

## 2026-09-18 — Primera versión funcional (commits `f87f797`, `d49e848`)

**Qué:** API Express + Sequelize + SQLite con productos, bodegas, movimientos, pedidos,
despacho multibodega y consulta obligatoria. Seed de demo. Documentación inicial generada con
Antigravity (README, AGENTS, ASSUMPTIONS, BITACORA, ADR-001..003).

**Por qué:** entrega del Sistema C de la prueba técnica del curso.

**Evidencia:** ver [`../BITACORA-IA.md`](../BITACORA-IA.md) sesión 1.

**Cómo revertir:** no aplica (estado inicial).
