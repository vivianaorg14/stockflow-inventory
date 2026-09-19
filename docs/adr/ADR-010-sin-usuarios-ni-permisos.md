# ADR-010 — Sin autenticación ni permisos por bodega en la primera versión

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-008 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md)

## Contexto y problema

Una distribuidora con tres bodegas podría querer que cada operador solo toque su bodega. La
prueba deja la autenticación avanzada fuera del alcance general.

## Factores de decisión

- Prioridad: reglas de inventario, trazabilidad y consulta obligatoria.
- No afirmar seguridad que no existe.

## Alternativas consideradas

1. Acceso general sin usuarios.
2. Roles generales (admin, operador, consulta).
3. Permisos por bodega.

## Decisión

Se elige **acceso general**: la API no autentica ni autoriza. Los permisos por bodega quedan
como mejora futura.

### Consecuencias

- Positivas: todo el esfuerzo va a las reglas del dominio.
- Negativas: cualquiera con acceso a la red puede operar cualquier bodega; **no apto para
  producción**.
- Obligaciones: la documentación y la defensa lo declaran como limitación conocida, nunca como
  "seguridad básica".

## Pros y contras de las alternativas

### Acceso general (elegida)

- ✅ Cero código de auth.
- ❌ Sin trazabilidad de *quién* hizo cada movimiento.

### Roles generales

- ✅ Separa responsabilidades.
- ❌ Diseñar, implementar y probar permisos.

### Permisos por bodega

- ✅ Modelo realista para una distribuidora.
- ❌ Los traslados necesitan permiso sobre dos bodegas; excesivo para v1.

## Evidencia en el código

No hay middleware de autenticación en `index.js` ni en `src/routes/index.js`. `Movimiento` no
tiene campo de usuario.
