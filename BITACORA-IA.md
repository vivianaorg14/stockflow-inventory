# BITACORA-IA.md — StockFlow

> Registro de cada sesión de trabajo con herramientas de inteligencia artificial.  
> **Formato por entrada:** qué pedí, qué propuso el agente, qué acepté, qué rechacé y por qué.

---

## Sesión 1 — 2026-09-18

**Herramienta usada:** Antigravity (agente de IA en entorno de desarrollo)  
**Duración aproximada:** ~1 hora  
**Objetivo de la sesión:** Crear la documentación base del proyecto antes de iniciar el código.

### Qué pedí

Le entregué al agente el enunciado completo de la prueba técnica y el enunciado específico del Sistema C. Le solicité que:

1. Revisara los dos archivos MD que ya tenía adelantados (`ASSUMPTIONS.md` y `StockFlow_Analisis_Asunciones.md`).
2. Generara todos los archivos de documentación faltantes: `README.md`, `AGENTS.md`, `BITACORA-IA.md` y los tres ADRs mínimos exigidos.
3. Respetara las decisiones de diseño ya tomadas en mis archivos anteriores.

### Qué propuso el agente

- Leer los archivos existentes antes de generar nada, para no duplicar trabajo ni contradecir decisiones ya tomadas.
- Estructura de README con: descripción, entidades, reglas, stack, instrucciones de ejecución y guía de defensa.
- AGENTS.md con contexto técnico completo para que futuros prompts tengan el modelo del dominio cargado.
- Tres ADRs enfocados en: elección de Antigravity como herramienta de IA, elección de SQLite como base de datos, e inmutabilidad de movimientos como patrón de trazabilidad.
- Esta misma bitácora con el formato pedido por el enunciado.

### Qué acepté

- La estructura general de todos los archivos.
- Los tres temas propuestos para los ADRs: son los más defendibles y los que el evaluador seguramente preguntará.
- El nivel de detalle del README con instrucciones de ejecución paso a paso.
- La sección de "instrucciones de comportamiento" en `AGENTS.md` para que el agente no invente reglas cuando ayude a codificar.

### Qué rechacé / modifiqué

- El agente propuso inicialmente un frontend en React. Lo rechacé porque el enunciado no lo exige y añadiría complejidad innecesaria al alcance de una semana. La decisión se documenta en `ASSUMPTIONS.md` como AS-008 (usuarios y permisos: acceso general de demostración).
- El agente sugirió usar PostgreSQL. Lo rechacé a favor de SQLite porque no requiere instalación separada, lo que facilita la evaluación desde cero. Esta decisión queda en el ADR-002.

### Aprendizajes de la sesión

- Es importante entregar el contexto del dominio antes de pedir código, para evitar que el agente invente reglas que no están en el enunciado.
- Los archivos MD generados sirven como "memoria persistente" del proyecto entre sesiones de trabajo.

---

### Contexto entregado al agente en esta sesión

(Trasladado desde el `AGENTS.md` original el 2026-09-18; allí no debe vivir un log de sesión.)

- Enunciado completo del Sistema C.
- Descripción de entidades, reglas y consulta obligatoria.
- Decisión de stack: Node.js + Express + SQLite + Sequelize.
- Instrucción de generar documentación MD (README, AGENTS.md, ASSUMPTIONS.md, BITACORA-IA.md, ADRs).

---

## Sesión 2 — 2026-09-18

**Herramienta usada:** Claude Code (Opus 5)  
**Duración aproximada:** ~1 hora  
**Objetivo de la sesión:** ordenar la documentación según el protocolo de docs de la autora
(`docs/00–08`, ADR en carpeta propia, `CLAUDE.md`/`AGENTS.md` como punteros) **sin tocar código**.

### Qué pedí

Clonar el repo, tomar el enunciado del Sistema C como referencia, reorganizar la documentación
usando la plantilla estándar de agentes y preparar una carpeta de ADR. Explícitamente: nada de código.

### Qué propuso el agente

- Leer todo el repo y **ejecutar lo que existe** antes de escribir una línea de documentación,
  para describir lo que hay y no lo que debería haber.
- Estructura `docs/00-INDEX`, `01-arquitectura`, `02-dominio`, `04-convenciones`, `05-runbook`,
  `06-pendientes`, `07-historial`, `08-enunciado` (enunciado literal como fuente de verdad),
  `adr/`, `superpowers/`, `_archivo/`.
- Mover los tres ADR a `docs/adr/` sin reescribirlos (son registros fechados) y formalizar las
  ocho asunciones AS-001..008 como ADR-004..010 en formato MADR, más ADR-011 (sin frontend,
  decisión que ya estaba tomada en la sesión 1 pero sin registro).
- Congelar `StockFlow_Analisis_Asunciones.md` en `_archivo/` y reducir `ASSUMPTIONS.md` a una
  tabla que enlaza a cada ADR, para no tener la misma decisión escrita tres veces.
- Sacar de `AGENTS.md` el log de sesión (a esta bitácora) y el modelo de dominio (a `docs/02`).
- Registrar como pendientes con evidencia lo que encontró al probar, en vez de arreglarlo.

### Qué se encontró al verificar (evidencia, no suposición)

- El README documentaba `GET /productos` etc., pero `index.js` monta todo en `/api`:
  `curl localhost:3000/productos` → **404**. Corregido en el README nuevo.
- Existencia insuficiente en traslado responde **500** en vez de 400 (el controlador busca la
  palabra "negativa" en un mensaje que dice "insuficiente") → `D-05`.
- `POST /api/pedidos` con un ítem inválido devuelve 400 pero **deja creado el pedido vacío** → `D-07`.
- Nada reconstruye el saldo desde `movimientos`, y el seed crea existencias sin movimientos que
  las respalden: la regla R3 del enunciado no es demostrable hoy → `D-01`, `D-02`.
- ADR-003 habla de un tipo `AJUSTE` que el ENUM no tiene → nota fechada al pie del ADR y `D-03`.
- No hay tests, lint ni type-check → `Q-01`..`Q-03`.

### Qué acepté / qué rechacé

- Acepté la estructura de documentación modular en `docs/` y el traslado de las decisiones a ADRs formales en formato MADR.
- Mantuve congeladas las notas iniciales en `docs/_archivo/` para conservar la trazabilidad de análisis previa.

### Aprendizajes de la sesión

- Documentación escrita **antes** del código y no contrastada después miente sin que nadie lo
  note (el caso `/api`). Toda ruta documentada se prueba con `curl` antes de commitear.
- Una decisión con alternativas merece un ADR, no un párrafo en tres ficheros distintos.
- Registrar defectos como pendientes con evidencia vale más que arreglarlos "de paso" en una
  sesión cuyo objetivo era otro.

---

## Sesión 3 — 2026-09-18

**Herramienta usada:** Claude Code, por subagentes (una tarea del plan por subagente, en
sesiones separadas con revisión entre tareas).  
**Duración aproximada:** una sesión larga, repartida en 9 tareas.  
**Objetivo de la sesión:** cerrar toda la deuda registrada en la sesión 2 (`D-01..D-10`,
`Q-01`, `Q-02`, `V-01`) con un diseño único, y añadir una interfaz para que el evaluador no
necesite `curl`.

### Qué pedí

Aprobar un diseño (spec) que resolviera de una vez los diez defectos y las dos tareas de
calidad abiertas, con servicios de dominio, un tipo `AJUSTE`, auditoría de R3, mínimo por API,
cancelación de pedidos, frontend estático y suite de tests + lint. Ejecutarlo en tareas
pequeñas, cada una con su propio subagente, y cerrar con esta misma entrada.

### Qué propuso el agente

- Spec única ([`docs/superpowers/specs/2026-09-18-v1-completa-design.md`](docs/superpowers/specs/2026-09-18-v1-completa-design.md))
  con tres ADR nuevos: servicios de dominio (ADR-012), frontend estático que sustituye a
  ADR-011 (ADR-013), tipo `AJUSTE` con `sentido` y `notas` obligatorio (ADR-014).
- Plan de 9 tareas TDD: modelos y errores tipados → servicio de inventario → servicio de
  pedidos → seed rehecho sobre movimientos → rutas y controladores HTTP → frontend → suite
  completa → recorrido manual de la UI (`V-01`) → este cierre de lint y documentación.
- Cerrar `D-01`/`D-02` con `servicios/inventario.auditar()` en vez de una reconstrucción bajo
  demanda más compleja; cerrar `D-05`/`D-07`/`D-08` unificando validación y manejo de errores en
  los servicios en lugar de parchear cada controlador por separado.
- Verificar `V-01` con Playwright real (Edge headless) en vez de darlo por bueno a ojo.

### Qué se encontró al verificar (evidencia, no suposición)

- `npm run verify` queda en verde (29 tests al cerrar las 9 tareas; 37 tras la ola de fixes de la
  revisión final); salida completa en [docs/07-historial.md](docs/07-historial.md).
- Los `curl` de auditoría, `AJUSTE`, mínimo y cancelar responden lo documentado en
  [docs/05-runbook.md](docs/05-runbook.md), probados contra un servidor recién sembrado.
- El recorrido de las 5 pestañas de la UI con Playwright dio 12/12 checks OK, antes y después de
  la ola de fixes.
- La revisión final de toda la rama encontró cuatro fallos: despacho a bodega inexistente → 500, JSON
  malformado → 500, ids de ruta no numéricos → 500, y un XSS almacenado vía `nombre` en el
  `<select>` de productos. Se arreglaron con 8 tests nuevos; se migraron controladores al patrón de errores tipados y se añadió `.env` con `dotenv`.
- Cierre de opcionales: `npm run verify` quedó en 42/42 tests, lint limpio y cobertura de 98.59% líneas.

### Qué acepté / qué rechacé

- Acepté la implementación de servicios de dominio desacoplados y el catálogo tipado de errores (`ErrorDeNegocio`, `NoEncontrado`).
- Acepté la incorporación del frontend HTML/CSS/JS nativo para simplificar la evaluación manual.

### Aprendizajes de la sesión

- Un diseño único que cierra varios defectos con la misma causa sale más barato que arreglarlos uno por uno.
- "Terminado" se define con verificación ejecutada, no con la simple lectura del código.
- Automatizar el recorrido de la interfaz da evidencia verificable e inmutable.

---

## Sesión 4 — 2026-09-19

**Herramienta usada:** Antigravity (Google DeepMind)  
**Duración aproximada:** ~1 hora  
**Objetivo de la sesión:** Migración, integración gradual por fases y verificación exhaustiva de la versión completa del proyecto en el repositorio Git principal, asegurando trazabilidad y correspondencia de los ADRs.

### Qué pedí

1. Tomar el desarrollo integral del proyecto y trasladarlo de forma gradual y ordenada al repositorio principal.
2. Realizar la integración mediante fases modulares con commits semánticos en Git, permitiendo una historia limpia y comprensible.
3. Asegurar que los Registros de Decisiones de Arquitectura (ADR-001 al ADR-014) y la documentación técnica acompañen la arquitectura implementada.
4. Ejecutar la verificación completa (linter, suite de tests unitarios/integración y umbrales de cobertura con `c8`).
5. Actualizar la bitácora de IA con el registro formal de la sesión de hoy.

### Qué propuso el agente

- Plan de integración modular en 7 fases:
  1. **Fase 1: Configuración, variables de entorno y tooling** (`package.json`, `.gitignore`, `.env.example`, `eslint.config.js`, `src/config.js`, `src/database.js`).
  2. **Fase 2: Modelos Sequelize y errores de dominio** (`src/models/`, restricción única producto-bodega, enum `AJUSTE`, y `src/servicios/errores.js`).
  3. **Fase 3: Servicios de lógica de negocio** (`src/servicios/validaciones.js`, `inventario.js`, `pedidos.js` correspondientes a ADR-009, ADR-012 y ADR-014).
  4. **Fase 4: Controladores, rutas y aplicación Express** (`src/controllers/`, `src/routes/`, `src/app.js`, `index.js`).
  5. **Fase 5: Datos de prueba iniciales (seed)** (`seed.js` con trazabilidad completa de movimientos según regla R3).
  6. **Fase 6: Pruebas automatizadas y frontend interactivo** (`tests/` con 42 tests automatizados y `public/` para evaluación visual, ADR-013).
  7. **Fase 7: Documentación completa** (`docs/`, matriz de 14 ADRs en `docs/adr/`, `README.md`, `ASSUMPTIONS.md`, `CLAUDE.md`, `BITACORA-IA.md`).
- Ejecutar `npm run verify` para certificar que el 100% de los tests pasan y se cumplen los umbrales de cobertura antes de cerrar el proceso.

### Qué acepté

- El plan de commits semánticos (`chore:`, `feat(models):`, `feat(servicios):`, `feat(api):`, `feat(seed):`, `test:`, `docs:`).
- La validación mediante `npm run verify` que confirmó **42/42 tests exitosos** y **98.59% de cobertura**.
- La organización de los 14 ADRs formales en la carpeta estándar `docs/adr/` vinculados a la matriz de `ASSUMPTIONS.md`.

### Qué rechacé / modifiqué

- Detuve el avance antes del cierre para constatar la sincronización explícita de los ADRs con las decisiones técnicas tomadas, solicitando la actualización de la bitácora con los hitos de la sesión de hoy para garantizar la trazabilidad completa del desarrollo.

### Aprendizajes de la sesión

- Integrar un proyecto completo a través de commits semánticos y verificables no solo organiza el control de versiones, sino que permite auditar cada componente de forma aislada.
- Mantener los ADRs organizados y enlazados a la bitácora y asunciones previene discrepancias entre la intención de diseño y la implementación final del sistema.
- Las pruebas automatizadas que abarcan desde reglas de negocio hasta endpoints HTTP y servicio de archivos estáticos actúan como red de seguridad indispensable en cualquier proceso de integración.

---

## Sesión 5 — 2026-09-19

**Herramienta usada:** Antigravity (Google DeepMind)  
**Duración aproximada:** ~1 hora  
**Objetivo de la sesión:** Implementación de la extensión de diseño para roles jerárquicos (`supervisor_mayor` y `supervisor_menor`), autenticación JWT, límite estricto a 3 bodegas y balanceo sugerido de inventario para pedidos.

### Qué pedí

1. Modelar usuarios con dos roles: `supervisor_mayor` (global) y `supervisor_menor` (atado obligatoriamente a una bodega).
2. Garantizar que en el sistema exista exactamente 1 `supervisor_mayor` y exactamente 1 `supervisor_menor` por cada una de las 3 bodegas.
3. Implementar autenticación básica mediante JWT sin sobre-ingeniería.
4. Restringir la operación y consulta de inventario del `supervisor_menor` a su propia bodega asignada (devolviendo HTTP 403 si intenta actuar sobre otra).
5. Limitar el número de bodegas a exactamente 3 (rechazando con HTTP 400 cualquier intento de crear una 4ª bodega vía API).
6. Crear una función de balanceo preventivo sugerido (`POST /api/pedidos/:id/sugerir-reparto`) que proponga el reparto multibodega priorizando excedentes sobre el stock mínimo, sin ejecutar despachos ni alterar la base de datos.
7. Actualizar `seed.js` para sembrar los 4 usuarios iniciales.
8. Documentar exhaustivamente como extensión de diseño en `README.md`, `ASSUMPTIONS.md`, un nuevo ADR (`ADR-015`) y esta bitácora.

### Qué propuso el agente

- Presentar un plan técnico formal ([`implementation_plan.md`](implementation_plan.md)) antes de escribir código.
- Implementar la emisión y verificación de JWT (HS256) y el hashing de contraseñas (`scrypt`) utilizando el módulo nativo `crypto` de Node.js, logrando cero dependencias externas adicionales en `package.json`.
- Restringir la unicidad de los roles tanto con validaciones de modelo Sequelize (hooks `beforeCreate`/`beforeUpdate`) como en la capa de servicios.
- Desarrollar un algoritmo preventivo de balanceo en `src/servicios/pedidos.js`:
  - *Fase 1*: Priorizar bodegas con excedente seguro (`cantidad_actual - minimo > 0`).
  - *Fase 2*: Si no alcanza, asignar del remanente emitiendo advertencias de qué bodegas quedarían bajo mínimo.
  - *Garantía*: Solo lectura, sin mutación de existencias.
- Crear una nueva suite de pruebas automatizadas (`tests/roles-auth.test.js`) con 10 pruebas específicas para cubrir todos los nuevos flujos y casos de borde.

### Qué acepté

- El plan de implementación y el uso de `crypto` nativo para máxima portabilidad y velocidad.
- La lógica de balanceo preventivo sugerido que protege los niveles mínimos de stock.
- La suite completa de 52 pruebas automatizadas y el paso limpio de `npm run verify` con cobertura superior al 92%.
- La formalización del [ADR-015](docs/adr/ADR-015-roles-usuarios-y-limite-bodegas.md) en el catálogo de arquitectura.

### Qué rechacé / modifiqué

- Se descartó cualquier despacho automático en la función de balanceo: el sistema únicamente devuelve la sugerencia analítica en JSON para que el `supervisor_mayor` tome la decisión final de despacho.
- Se mantuvo la compatibilidad con el frontend estático y los 42 tests previos, permitiendo que consultas no autenticadas en modo demo/test mantengan acceso de lectura global.

### Aprendizajes de la sesión

- Diseñar extensiones desacopladas (servicios de dominio + middlewares) permite añadir capas de seguridad y lógica avanzada sin poner en riesgo las reglas contables preexistentes.
- Las herramientas nativas de la plataforma (como `crypto` en Node.js) muchas veces eliminan la necesidad de dependencias de terceros, reduciendo la superficie de ataque y los problemas de compatibilidad en entornos de evaluación.
- El balanceo asistido mediante sugerencias auditables respeta el principio de gobierno humano y trazabilidad contable del sistema.

---

## Sesión 6 — 2026-09-20

**Herramienta usada:** Antigravity (Google DeepMind)  
**Duración aproximada:** ~1.5 horas  
**Objetivo de la sesión:** Corregir la persistencia de sesión en frontend, implementar sincronización de datos en tiempo real entre usuarios, ajustar visualización de métricas y desplegar el sistema en producción en la nube.

### Qué pedí

1. Corregir el cierre involuntario de sesión al recargar la página (F5), evaluando `localStorage` vs `sessionStorage`.
2. Modificar el layout del Dashboard analítico para apilar los gráficos de barras verticalmente a ancho completo.
3. Resolver la falta de sincronización de cambios entre usuarios distintos sin recargar manualmente la página, evaluando polling periódico vs WebSockets.
4. Asegurar que al crear un nuevo producto desde el Catálogo (acción exclusiva del `supervisor_menor`), este aparezca reflejado de inmediato en la pantalla de Existencias.
5. Guiar y configurar los archivos para el despliegue del proyecto en la nube (Vercel y Render), diagnosticando errores de runtime y documentando la arquitectura real de despliegue.

### Qué propuso el agente

- **Diagnóstico de sesión:** Descubrió que al hacer F5, `verificarSesionInicial` fallaba por una desestructuración incorrecta de `GET /api/auth/perfil` (`perfil.usuario` arrojaba `undefined`), lo cual disparaba el `catch` y borraba el token. Propuso migrar el almacenamiento a `localStorage` para garantizar la persistencia multi-pestaña.
- **Layout:** Reemplazar el grid CSS por un contenedor flex vertical (`width: 100%`) con altura de canvas de 320px.
- **Sincronización multiusuario:** Recomendó la opción de **polling inteligente cada 5 segundos** en lugar de WebSockets. Esta solución evita dependencias externas pesadas, respeta el estado de la suite de pruebas sin dejar sockets abiertos y suspende las peticiones si la pestaña está oculta (`document.hidden`) o si el usuario está interactuando con un campo del formulario.
- **Existencias de productos nuevos:** Al crear un producto (`POST /api/productos`), el backend inicializa automáticamente sus registros en `ExistenciaPorBodega` (con cantidad `0` y mínimo `0`) para cada bodega existente, permitiendo que aparezca en la consulta obligatoria sin violar las pruebas existentes.
- **Diagnóstico de Vercel vs Render:** Identificó que Vercel arroja `Error: Please install sqlite3 package manually` porque sus Lambdas serverless excluyen binarios compilados en C++ y poseen un sistema de archivos de solo lectura (`EROFS`). Recomendó y configuró el despliegue en **Render** como un Web Service Node.js continuo, logrando compilar `sqlite3` de forma nativa e inicializar los datos con `npm run seed`.

### Qué acepté

- La migración a `localStorage` y la corrección del handler de arranque.
- La solución de polling inteligente cada 5 segundos para mantener a ambos supervisores sincronizados.
- La decisión de desplegar en Render (`https://stockflow-inventory-ufps.onrender.com/`), descartando la sobre-ingeniería de migrar la base de datos a PostgreSQL en Vercel para una prueba técnica basada en SQLite.
- La incorporación del [ADR-016](docs/adr/ADR-016-despliegue-en-render.md) y [ADR-005-despliegue](docs/ADR-005-despliegue.md) documentando la limitación de almacenamiento efímero en el plan gratuito de Render.
- La suite final de **56 pruebas automatizadas** pasando al 100% con **>92% de cobertura de código**.

### Qué rechacé / modifiqué

- Se descartó el uso de WebSockets o SSE debido a la complejidad de mantenimiento de conexiones y potenciales fallos con suites de testing concurrentes.
- Se mantuvo el permiso exclusivo para que el `supervisor_menor` sea quien cree productos en el Catálogo, rechazando la propuesta inicial de bloquear la creación de productos para ambos roles.

### Aprendizajes de la sesión

- Las plataformas serverless como Vercel imponen restricciones severas sobre dependencias nativas C++ (como `sqlite3`) y sistemas de archivos locales; seleccionar la plataforma adecuada (PaaS de proceso continuo como Render) ahorra refactorizaciones invasivas de base de datos.
- El polling optimizado con eventos del navegador (`visibilitychange` y verificación de `activeElement`) brinda una experiencia de usuario cercana al tiempo real con un costo de implementación y riesgo operativo casi nulo.
- Toda limitación de plataforma (como la efimeridad de contenedores gratuitos en redeploy) debe ser documentada como una decisión de arquitectura consciente (ADR) y no como un defecto no planificado.


