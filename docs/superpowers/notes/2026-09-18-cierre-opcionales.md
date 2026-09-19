# Cierre de opcionales — brief (2026-09-18)

Cerrar todo lo que queda en `docs/06-pendientes.md` salvo `DOC-01` (es de la autora). Sin commits.
TDD donde haya comportamiento. Al final `npm run verify` limpio. Español. No abrir pendientes nuevos:
si algo no se puede cerrar, se explica en el informe y se deja tal cual en `06`.

## M-02 — enums sin `escapar()` en `public/app.js`
Pasar por `escapar()` `f.estado_producto`, `m.tipo`, `p.estado` (producto) y `p.estado` (pedido) en
los templates de `renderizarExistencias`, `renderizarMovimientos`, `renderizarCatalogo`,
`renderizarPedidos`. Cuidado: en `renderizarPedidos` el `estado` también va en un atributo
`class="estado ${p.estado}"` — escapar ahí también. Sin test automático (no hay harness de UI).

## M-03 — favicon 404
En `public/index.html` `<head>`: `<link rel="icon" href="data:,">`. Test en `tests/arranque.test.js`:
`GET /` contiene `rel="icon"`.

## M-04 — `item.id === item_pedido_id`
En `src/servicios/pedidos.js` `aplicarDespacho`: validar `item_pedido_id` con `validarId` (ya existe
en `validaciones.js`) antes del `find`, y comparar con el valor validado (número). Test en
`tests/pedidos.test.js`: despacho con `item_pedido_id: "1"` (string) → 200 y descuenta; con `"abc"`
→ 400.

## M-05 — `validarCantidad(true)`
En `validaciones.js` `aEntero`: si `typeof valor === 'boolean'` → `ErrorDeNegocio(`${campo} debe ser
un número entero`)`. Test en `tests/validaciones.test.js`: `true` y `false` rechazados por
`validarCantidad`, `validarEnteroNoNegativo` y `validarId`.

## M-06 — logs del seed
En `seed.js` `cargarDatosDemo(registrar = () => {})`: parámetro opcional; llamar `registrar('✅ 3
bodegas creadas')`, `'✅ 5 productos creados (1 descontinuado)'`, `'✅ 10 existencias vía movimientos'`,
`'✅ traslado y salida de ejemplo'`, `'✅ 1 pedido de prueba'` en los puntos correspondientes. El bloque
`require.main === module` pasa `console.log`. Los tests siguen llamando `cargarDatosDemo()` sin
argumentos (silencioso). Test en `tests/seed.test.js`: `cargarDatosDemo(m => mensajes.push(m))`
produce 5 mensajes.

## Q-03 — cobertura con umbral (N2)
`npm i -D c8@^10`. Script `"test:cov": "c8 --reporter=text --reporter=text-summary --lines 90
--functions 90 --branches 80 --statements 90 --include 'src/**' --include 'seed.js' npm test"` y
`"verify": "npm run lint && npm run test:cov"`. Ejecutar; si algún umbral no pasa, **bajar el umbral
al valor real menos 2 puntos** (redondeado abajo) y decirlo en el informe — no escribir tests de relleno.
`.gitignore` ya tiene `coverage/`. Actualizar `docs/04-convenciones.md` Parte C: nivel declarado
**N2**, fila de cobertura con el comando y los umbrales reales; `docs/05-runbook.md` baseline con
la salida real de `test:cov` (resumen, no la tabla entera).

## DOC-02 — colección de peticiones
Crear `docs/stockflow.postman_collection.json` (Postman v2.1, sin dependencias): variable
`baseUrl = http://localhost:3000`; una petición por cada `curl` de la sección "Peticiones de demo"
de `docs/05-runbook.md`, mismos cuerpos y mismo orden, nombres en español con la regla que demuestra
(`R1 — traslado OK`, `R4 — entrada a descontinuado (400)`…). Añadir en `05-runbook.md`, justo antes
de los `curl`, una línea: "Misma secuencia importable en Postman/Bruno: [`stockflow.postman_collection.json`](../../stockflow.postman_collection.json)".
Validar el JSON con `node -e "JSON.parse(require('fs').readFileSync('docs/stockflow.postman_collection.json','utf8'))"`.

## Docs de cierre
- `docs/06-pendientes.md`: quitar `M-02..M-06`, `Q-03`, `DOC-02`; dejar `DOC-01`; nota de una línea
  "cerrados el 2026-09-18, ver 07". Quitar la sección "Deuda menor" si queda vacía.
- `docs/07-historial.md`: UNA entrada nueva arriba "Cierre de opcionales" con qué (lista M/Q/DOC) ·
  por qué · evidencia (salida `verify` con cobertura) · cómo revertir (por fichero).
- `docs/00-INDEX.md`: línea de calidad → N2 con los porcentajes; "Trabajo en curso: ninguno; abierto sólo `DOC-01`".
- `docs/01-arquitectura.md`: fila "Cobertura" en la tabla de stack.
- `README.md`: "Limitaciones" quitar "sin cobertura de tests con umbral"; mapa: añadir la colección.
- `BITACORA-IA.md` sesión 3, "Qué se encontró": una línea sobre este cierre y los porcentajes.
- Chequeo de enlaces del protocolo sobre `docs/` y raíz: 0 rotos.
