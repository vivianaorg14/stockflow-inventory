# ADR-003 — Inmutabilidad de movimientos de inventario

**Estado:** Aceptado  
**Fecha:** 2026-09-18  
**Autora:** Viviana Ortiz

---

## Contexto

Una de las reglas obligatorias del enunciado es:

> "Todo movimiento queda registrado de forma que el saldo pueda reconstruirse a partir de la historia."

Esto implica una decisión de diseño sobre qué sucede cuando hay un error en un movimiento ya registrado: ¿se edita, se elimina, o se corrige de otra forma?

---

## Decisión

Los movimientos confirmados son **inmutables**: no se pueden editar ni eliminar. Los errores se corrigen registrando un nuevo movimiento de ajuste o reversión.

---

## Alternativas consideradas

### Opción A — Permitir editar y eliminar movimientos

El usuario puede corregir directamente un movimiento ya registrado.

**Ventajas:**
- Simple de implementar en la interfaz.
- Corrección directa y rápida.

**Desventajas:**
- Destruye la historia: no hay forma de saber qué decía el registro antes de la edición.
- Rompe la regla del enunciado: si se edita un movimiento, el saldo ya no puede reconstruirse completamente a partir de la historia.
- Introduce inconsistencias si otros movimientos posteriores dependen del valor original.
- Vulnera la trazabilidad de auditoría.

**Razón de descarte:** viola directamente la regla obligatoria del enunciado.

### Opción B — Movimientos inmutables + ajuste manual ✅ (elegida)

Una vez confirmado, el movimiento no se modifica. Para corregir un error:
- Se registra un nuevo movimiento con tipo `AJUSTE` o con cantidad negativa/positiva según corresponda.
- El movimiento de ajuste puede referenciar al movimiento original en el campo `notas`.

**Ventajas:**
- Conserva la historia completa.
- El saldo puede reconstruirse en cualquier momento sumando todos los movimientos.
- Facilita la auditoría: cada cambio deja rastro.
- Coherente con el enunciado.

**Desventajas:**
- El historial puede incluir movimientos de ajuste que "ensucian" la vista.
- Requiere que el usuario entienda que no puede "borrar" un error.

**Razón de elección:** es la única opción que cumple estrictamente la regla de trazabilidad del enunciado.

### Opción C — Reversión controlada (patrón de compensación)

Se genera una operación inversa vinculada al movimiento original (por ejemplo, si hubo una entrada de 10 unidades por error, se registra una salida de 10 unidades con referencia al movimiento original).

**Ventajas:**
- Historia clara de qué se compensó y por qué.
- El movimiento original queda visible.

**Desventajas:**
- Más complejo de implementar correctamente.
- Para traslados, la reversión requiere coordinar dos bodegas (origen y destino).

**Decisión:** esta opción es válida, pero se simplifica para la primera versión como un ajuste manual (Opción B). Se puede implementar como mejora futura con un flag `es_reversión` y referencia al movimiento original.

---

## Implementación

La regla se implementa en la capa de controlador:

```javascript
// controllers/movimientos.js
// Los movimientos solo tienen operación de creación (POST).
// No existe ruta PUT /movimientos/:id ni DELETE /movimientos/:id.
```

El modelo `Movimiento` en Sequelize no expone métodos de actualización desde las rutas.

---

## Consecuencias

- Solo existe `POST /movimientos` para crear. No hay `PUT` ni `DELETE` de movimientos.
- El saldo actual de cada bodega se puede calcular en cualquier momento sumando todas las entradas y restando todas las salidas y traslados de esa bodega.
- Los ajustes por error quedan registrados con tipo `ENTRADA` o `SALIDA` y con referencia en el campo `notas`.
- Esta decisión protege la integridad de la consulta obligatoria.

---

## Notas para la defensa oral

> **Pregunta probable:** ¿Qué pasa si alguien registra una entrada con cantidad incorrecta? ¿No hay forma de corregirlo?

**Respuesta preparada:** Sí hay forma, pero no editando el registro original. Se registra un nuevo movimiento que compensa el error. Por ejemplo, si entré 100 unidades y eran 80, registro una salida de 20 con una nota que dice "ajuste por error en entrada #X". Así la historia queda completa y el saldo final es correcto. Esto es lo que hacen los sistemas contables: ningún asiento se borra, se contrasienta.

> **Pregunta probable:** ¿No es más complejo para el usuario?

**Respuesta preparada:** Sí, requiere que el operador entienda que el sistema es un libro de registros, no una planilla de Excel. Pero esa complejidad protege la integridad de los datos y permite auditar exactamente qué pasó y cuándo.

---

> **Nota 2026-09-18 (posterior a la redacción, no se reescribe lo anterior):** el código real no
> tiene tipo `AJUSTE`: el ENUM de `Movimiento.tipo` es `ENTRADA | SALIDA | TRASLADO`, y los
> ajustes se registran como `ENTRADA`/`SALIDA` con el motivo en `notas`. La ruta citada arriba
> como `controllers/movimientos.js` es `src/controllers/movimientosController.js`. Ver
> pendiente `D-03` en [06-pendientes](../06-pendientes.md).
