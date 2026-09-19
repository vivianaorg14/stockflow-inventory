# ADR-012 — Reglas de negocio en servicios de dominio, no en controladores

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** cierra la excepción "lógica en controladores" de [04-convenciones](../04-convenciones.md) y `D-06`; spec [v1 completa](../superpowers/specs/2026-09-18-v1-completa-design.md)

## Contexto y problema

Las reglas R1–R4 viven dentro de los controladores Express. Al probar el 2026-09-18 aparecieron
tres defectos con la misma causa: la validación de cantidad existe en un sitio y falta en otros
(`D-08`), el descuento de existencia está escrito dos veces (`registrar` y `despacharPedido`) y
la traducción error → código HTTP se hace con `includes("negativa")` sobre un texto (`D-05`).
Hay que cerrar esos defectos y añadir AJUSTE, auditoría, mínimo y cancelar: seguir en los
controladores multiplicaría la duplicación.

## Factores de decisión

- Regla global: un concepto de dominio = un dueño de código.
- Testabilidad sin levantar HTTP.
- No sobre-diseñar: alcance de una semana, un solo desarrollador.

## Alternativas consideradas

1. Seguir en los controladores, extrayendo solo funciones auxiliares compartidas.
2. Módulos de servicio por agregado (`inventario`, `pedidos`) con errores tipados; controladores solo HTTP.
3. Capa de dominio completa (entidades, repositorios, casos de uso, inyección de dependencias).

## Decisión

Se elige **servicios por agregado** (opción 2). Dos módulos con funciones exportadas, errores
`ErrorDeNegocio`/`NoEncontrado`, un middleware que los traduce a 400/404. Sin clases, sin
repositorios, sin DI: Sequelize se importa directo.

### Consecuencias

- Positivas: cada regla tiene un dueño; los tests de reglas no necesitan `supertest`; el código
  HTTP se traduce en un solo sitio.
- Negativas: refactor de código que funciona → exige tests de caracterización **antes**.
- Obligaciones: ningún controlador contiene un `if` de negocio; toda regla nueva entra por un
  servicio.

## Pros y contras de las alternativas

### Auxiliares compartidos

- ✅ Mínimo cambio.
- ❌ La regla sigue repartida; el mapeo de errores sigue por texto.

### Servicios por agregado (elegida)

- ✅ Proporcional al tamaño del proyecto; testeable.
- ❌ Un refactor que no aporta funcionalidad visible.

### Capa de dominio completa

- ✅ Canónico.
- ❌ Sobre-ingeniería evidente para 6 tablas y 15 endpoints.

## Evidencia en el código

`src/servicios/inventario.js` (`registrarMovimiento`, `ajustarExistencia`, `listarExistencias`,
`fijarMinimo`, `auditar`), `src/servicios/pedidos.js` (`crearPedido`, `despachar`, `cancelar`),
`src/servicios/errores.js` (`ErrorDeNegocio`, `NoEncontrado`),
`src/servicios/validaciones.js` (`validarCantidad`, `validarEnteroNoNegativo`). Middleware
`manejarErrores` en `src/controllers/http.js`, montado en `src/app.js`. Los controladores
(`src/controllers/*Controller.js`) solo parsean el body y llaman al servicio correspondiente.
