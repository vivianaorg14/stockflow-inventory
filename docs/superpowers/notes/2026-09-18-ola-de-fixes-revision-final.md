# Ola de fixes de la revisión final — brief

Repo: C:\Users\gogam\Desktop\Universidad\stockflow-inventory. Sin commits ni git write. TDD: test rojo → fix → verde. Al final `npm run verify` limpio; pegar salida. Español.

## Must fix

1. `src/servicios/pedidos.js` → `aplicarDespacho`: despacho a bodega inexistente devuelve 500 (FK falla dentro de `findOrCreate`). Fix: exportar `exigirBodega` desde `src/servicios/inventario.js` y llamar `await exigirBodega(bodega_id, transaccion)` antes de `ajustarExistencia` → 404. Test nuevo en `tests/pedidos.test.js`: `{ item_pedido_id, bodega_id: 9999, cantidad: 1 }` → 404 y existencias intactas.

2. `src/controllers/http.js` → `manejarErrores`: JSON malformado (body-parser pone `err.status = 400`) y `SequelizeValidationError` salen como 500. Fix: `const estado = err.estado || err.status || (err.name === 'SequelizeValidationError' ? 400 : 500);`. Test nuevo en `tests/arranque.test.js`: `request(app).post('/api/movimientos').set('Content-Type','application/json').send('{')` → 400 con `{ error }`.

3. Ids de ruta no numéricos → 500 (`Number('abc') = NaN` → SQL `id = NaN`). Fix: añadir `validarId(valor, campo)` a `src/servicios/validaciones.js` (entero ≥ 1, si no `ErrorDeNegocio`) y usarlo en `pedidosController.despachar/cancelar` (`req.params.id`) y en `inventarioController.fijarMinimo` (ambos params). Quitar el guard `if (!bodega_id) return;` de `exigirBodega` (los llamadores ya no pasan null: en `registrarMovimiento` solo se llama si `efecto.origen`/`efecto.destino` existe — ajustar esas dos llamadas a `if (efecto.origen) await exigirBodega(...)`). Además en `resolverEfecto` comparar origen/destino como `Number(...)` para que `1` y `"1"` cuenten como iguales. Tests: `POST /api/pedidos/abc/cancelar` → 400; `PUT /api/inventario/existencias/abc/1/minimo` → 400; test de `validarId` en `tests/validaciones.test.js`.

4. `public/app.js` → `opciones()`: escapar la etiqueta: `${escapar(etiqueta(e))}`. XSS almacenado vía `nombre`. (Sin test automático; verificar leyendo.)

## Minors que SÍ se hacen en esta ola (baratos)

5. `docs/05-runbook.md`: borrar la línea obsoleta "No hay `.env`." (contradice el párrafo nuevo sobre `.env`).
6. Migrar `src/controllers/productosController.js` y `bodegasController.js` a `capturar` + errores tipados (`NoEncontrado` para 404, `ErrorDeNegocio` para SKU repetido / nombre obligatorio / `estado` fuera de `{ACTIVO, DESCONTINUADO}`), sin `try/catch` ni `res.status(500)`. Así ADR-012 y `docs/01` dicen la verdad. Comportamiento observable igual salvo el whitelist de `estado` (`'LOQUESEA'` → 400). Tests: SKU repetido → 400 y estado inválido → 400 en un fichero nuevo `tests/catalogo.test.js` (2–3 tests).
7. `src/models/Movimiento.js`: actualizar el comentario de cabecera para incluir `AJUSTE` y `sentido` (cierra M-01).
8. `README.md` requisitos: "Node ≥ 22 (para `npm test`); ≥ 18 basta para ejecutar". Y en `package.json` añadir `"engines": { "node": ">=22" }`.
9. `docs/02-dominio.md` "Reglas adicionales": una línea: un pedido admite productos DESCONTINUADOS (R4 solo restringe entradas) y líneas repetidas del mismo producto.

## Docs de cierre de esta ola
- `docs/06-pendientes.md`: quitar `M-01`; renumerar NO (dejar hueco, nota "M-01 cerrado el 2026-09-18").
- `docs/07-historial.md`: una entrada nueva arriba "Ola de fixes de la revisión final" con qué/por qué/evidencia (salida de verify con el conteo real)/revertir.
- `docs/05-runbook.md` baseline: conteo real de tests tras la ola.
- `docs/01-arquitectura.md` sección errores: mencionar `err.status` (body-parser) y `SequelizeValidationError` → 400.
