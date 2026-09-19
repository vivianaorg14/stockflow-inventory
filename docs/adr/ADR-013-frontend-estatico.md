# ADR-013 — Frontend estático servido por Express, sin framework ni build

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** **sustituye a [ADR-011](ADR-011-api-sin-frontend.md)**; spec [v1 completa](../superpowers/specs/2026-09-18-v1-completa-design.md)

## Contexto y problema

ADR-011 dejó la v1 sin interfaz. La autora decidió el 2026-09-18 que el evaluador debe poder
operar el sistema sin `curl`: "interfaz sencilla pero funcional". Hay que elegir cómo, sin
convertir el proyecto en dos proyectos.

## Factores de decisión

- Cero fricción para ejecutar desde cero (`npm install && npm run seed && npm start`).
- Nada que compilar ni desplegar aparte.
- Tiempo: la interfaz no es lo que evalúa la prueba.

## Alternativas consideradas

1. HTML + JS + CSS estáticos en `public/`, servidos por el mismo Express, `fetch` a `/api`.
2. React/Vite como segundo proyecto con build.
3. Vistas renderizadas en servidor (EJS/Pug).

## Decisión

Se elige **estático en `public/`** (opción 1). Una página con pestañas, un `app.js` sin
dependencias, un CSS mínimo. `GET /` sirve la página; el mapa JSON de endpoints pasa a `GET /api`.

### Consecuencias

- Positivas: ninguna dependencia ni paso de build; misma URL; la API no cambia de forma.
- Negativas: sin componentes ni estado reactivo; cada acción recarga su pestaña. Aceptable
  para el alcance.
- Obligaciones: la UI **no** valida reglas de negocio por su cuenta: envía y muestra el `error`
  de la API. La regla vive en el servicio (ADR-012).

## Pros y contras de las alternativas

### Estático (elegida)

- ✅ Cero tooling; se lee entero en una sentada.
- ❌ Manual y verboso si crece.

### React/Vite

- ✅ Demo más vistosa; componentes.
- ❌ `node_modules` aparte, build, CORS o proxy; más que explicar en la defensa.

### Vistas en servidor

- ✅ Sin JS de cliente.
- ❌ Mezcla HTML y API en las mismas rutas; formularios sin `fetch` complican despachos multibodega.

## Evidencia en el código

`public/index.html` (cinco pestañas: Existencias, Movimientos, Pedidos, Auditoría, Catálogo),
`public/app.js`, `public/estilos.css`; `express.static(path.join(__dirname, '..', 'public'))`
en `src/app.js`. `GET /` sirve la página; `GET /api` da el mapa de endpoints. Recorrido manual
de las cinco pestañas (`V-01`) ejecutado con Playwright el 2026-09-18 — ver
[07-historial](../07-historial.md).
