# Cierre de opcionales — informe (2026-09-18)

Ejecutado sobre el brief [`2026-09-18-cierre-opcionales.md`](2026-09-18-cierre-opcionales.md).
Sin commits (no es nuestro repo). Baseline previo: 37/37 tests, lint sin salida.

## M-02 — enums sin `escapar()` en `public/app.js`

Pasados por `escapar()`: `f.estado_producto` (`renderizarExistencias`), `m.tipo`
(`renderizarMovimientos`), `p.estado` en el texto **y** en `class="estado ${escapar(p.estado)}"`
(`renderizarPedidos`), `p.estado` (`renderizarCatalogo`). Edición cuidadosa, sin test automático
(no hay harness de UI) — verificado leyendo el diff y con la suite existente en verde.

## M-03 — favicon 404

`public/index.html`: `<link rel="icon" href="data:,">` en el `<head>`.
RED: test `M-03: la raíz declara un favicon...` en `tests/arranque.test.js` fallaba
(`AssertionError: expected /rel="icon"/ ... actual` sin ese texto).
GREEN: 4/4 en `tests/arranque.test.js` tras el cambio.

## M-04 — `item.id === item_pedido_id`

`src/servicios/pedidos.js` `aplicarDespacho`: `item_pedido_id` se valida con `validarId` (ya
existente en `validaciones.js`) antes del `find`, y la comparación usa el número validado.
RED: los dos tests nuevos en `tests/pedidos.test.js` fallaban (`404 !== 200` con string,
`404 !== 400` con `"abc"`).
GREEN: 8/8 en `tests/pedidos.test.js`.

## M-05 — `validarCantidad(true)`

`validaciones.js` `aEntero`: `if (typeof valor === 'boolean') throw new ErrorDeNegocio(...)`
antes de `Number(valor)`.
RED: test nuevo en `tests/validaciones.test.js` fallaba (`true`/`false` no lanzaban).
GREEN: 6/6 en `tests/validaciones.test.js`.

## M-06 — logs del seed

`seed.js` `cargarDatosDemo(registrar = () => {})`: 5 llamadas a `registrar(...)` en los puntos
indicados en el brief. El bloque `require.main === module` pasa `console.log`. Los tests que ya
llamaban `cargarDatosDemo()` sin argumentos siguen silenciosos.
RED: test nuevo en `tests/seed.test.js` fallaba (`0 !== 5` mensajes).
GREEN: 4/4 en `tests/seed.test.js`.

## Q-03 — cobertura con umbral (N2)

`npm i -D c8@^10`. Scripts:

```
"test:cov": "c8 --reporter=text --reporter=text-summary --lines 90 --functions 90 --branches 80 --statements 90 --include \"src/**\" --include \"seed.js\" npm test"
"verify": "npm run lint && npm run test:cov"
```

**Nota técnica:** el brief usaba comillas simples (`'src/**'`) en el `--include`; en este PC
Windows, `npm run` ejecuta el script vía `cmd.exe` (no bash), que no despoja comillas simples —
`c8` recibía el patrón literal con comillas y no encontraba archivos (`0/0`, "Unknown%").
Se cambió a comillas dobles escapadas (`\"src/**\"`), que `cmd.exe` sí resuelve correctamente;
confirmado corriendo `npx c8 ... npm test` directo y comparando con `npm run test:cov`.

Umbrales del brief (90/90/80/90) se dejaron **tal cual**: la suite real los superó sin ayuda
(98.59 % líneas, 100 % funciones, 89.7 % ramas, 98.59 % sentencias) — no hubo que bajar ninguno.
`.gitignore` ya tenía `coverage/`. Actualizados: `docs/04-convenciones.md` (Parte C, nivel N2 con
comando y umbrales reales) y `docs/05-runbook.md` (baseline real, resumen de cobertura).

## DOC-02 — colección de peticiones

`docs/stockflow.postman_collection.json` (Postman v2.1, sin dependencias, variable
`baseUrl = http://localhost:3000`): 12 peticiones, una por cada `curl` de "Peticiones de demo"
en `docs/05-runbook.md`, mismo orden y mismos cuerpos, nombres en español (`R1 — traslado OK`,
`R4 — entrada a descontinuado (400)`, `D-04 — cancelar pedido (ajustar el id...)`, etc.). Línea
añadida en `05-runbook.md` justo antes del bloque `curl`. Validado:
`node -e "JSON.parse(require('fs').readFileSync('docs/stockflow.postman_collection.json','utf8'))"`
→ sin error; `item.length === 12`.

## Docs de cierre

- `docs/06-pendientes.md`: quitados `M-02`..`M-06`, `Q-03`, `DOC-02`; nota "cerrados el
  2026-09-18, ver 07"; queda solo `DOC-01`. Sección "Deuda menor" eliminada (quedó vacía).
- `docs/07-historial.md`: una entrada nueva arriba, "Cierre de opcionales", con qué/por qué/
  evidencia/cómo revertir por fichero.
- `docs/00-INDEX.md`: calidad → N2 con los porcentajes reales; "Trabajo en curso: ninguno;
  abierto sólo `DOC-01`"; conteo de tests actualizado a 42.
- `docs/01-arquitectura.md`: fila "Cobertura" añadida a la tabla de stack; conteo de tests a 42.
- `README.md`: quitada la limitación "sin cobertura de tests con umbral"; conteo de tests a 42;
  mapa con la colección Postman.
- `BITACORA-IA.md`: sesión 3, línea nueva en "Qué se encontró" sobre este cierre y los
  porcentajes.

## `npm run verify` — salida real (2026-09-18, tras todos los cambios)

```
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2527.2761

=============================== Coverage summary ===============================
Statements   : 98.59% ( 979/993 )
Branches     : 89.7% ( 183/204 )
Functions    : 100% ( 30/30 )
Lines        : 98.59% ( 979/993 )
================================================================================
```

Lint (`npm run lint`): sin salida, exit 0. `npm run verify`: exit 0.

**Umbrales finales:** líneas 90 %, funciones 90 %, ramas 80 %, sentencias 90 % — los del brief,
sin bajar ninguno.

## Chequeo de enlaces

Script en `/tmp/linkcheck.js` (recorre todo `docs/` + `README.md`, `BITACORA-IA.md`,
`CLAUDE.md`, `AGENTS.md`, `ASSUMPTIONS.md`, resuelve cada link relativo Markdown contra el
filesystem). Resultado: **0 rotos**, salvo un falso positivo esperado: el propio brief
(`docs/superpowers/notes/2026-09-18-cierre-opcionales.md`) cita textualmente la sintaxis del
enlace que había que añadir en `05-runbook.md` (`[...](../../stockflow.postman_collection.json)`)
como instrucción, no como enlace real de esa nota hacia ese archivo — las notas fechadas no se
reescriben (regla del protocolo), así que se deja tal cual.

## Preocupaciones / lo que no se cerró

- `DOC-01` queda abierto a propósito: es tarea de la autora (registrar en `BITACORA-IA.md` qué
  aceptó/rechazó de las sesiones 2 y 3), fuera del alcance de este cierre. Su fila se deja igual
  en `06-pendientes.md`.
- Ninguna nueva pendiente abierta.
- Cobertura de ramas (89.7 %) queda algo más floja que el resto de métricas por ramas de error
  poco ejercitadas en `bodegasController.js`, `config.js` y `http.js` (ver columna "Uncovered
  Line #s" en la salida de `test:cov`); no se tocó porque el umbral pedido (80 %) ya se supera
  con holgura y el brief prohíbe tests de relleno.
