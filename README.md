# StockFlow — Sistema de Inventario Multibodega

**Repositorio:** https://github.com/vivianaorg14/stockflow-inventory
**Sistema asignado:** C — Inventario con varias bodegas ([enunciado](docs/08-enunciado.md))
**Autora:** Viviana Ortiz Gáfaro
**Curso:** Herramientas de Empleabilidad en Ingeniería de Sistemas

---

## ¿Qué es StockFlow?

Proyecto de inventario para una distribuidora con tres bodegas: productos, existencias por
bodega, movimientos inmutables (entrada, salida, traslado) y pedidos que se despachan desde
una o varias bodegas. Resuelve el problema del enunciado —"el inventario se lleva en una hoja
de cálculo por bodega y nunca cuadra"— con una única base de datos y una historia de
movimientos que no se edita.

**Estado:** funcional, desplegado en producción en la nube (Render), con interfaz web, sincronización en tiempo real (polling 5s), suite de pruebas (56 casos con cobertura >92%), autenticación JWT nativa y control de acceso basado en roles (RBAC) con límite a 3 bodegas.

## Despliegue en Producción (Render — ADR-016)

El sistema se encuentra desplegado y accesible públicamente en la nube a través de **Render**:

- **🌐 Aplicación Web interactiva:** [https://stockflow-inventory-ufps.onrender.com/](https://stockflow-inventory-ufps.onrender.com/)
- **📦 Consulta obligatoria de existencias (API):** [https://stockflow-inventory-ufps.onrender.com/api/inventario/existencias](https://stockflow-inventory-ufps.onrender.com/api/inventario/existencias)
- **🗺️ Mapa de endpoints disponibles:** [https://stockflow-inventory-ufps.onrender.com/api](https://stockflow-inventory-ufps.onrender.com/api)

> [!TIP]
> Puedes iniciar sesión en el despliegue con las credenciales demo:
> - **Supervisor Mayor:** `carlos.mayor` / `mayor123`
> - **Supervisor Menor Norte:** `ana.norte` / `norte123`
> - **Supervisor Menor Sur:** `sergio.sur` / `sur123`
> - **Supervisor Menor Central:** `camilo.central` / `central123`

---

## Roles y Usuarios (Extensión de diseño — ADR-015)

> [!NOTE]
> Esta sección corresponde a una **extensión de diseño** incorporada para enriquecer el sistema con seguridad, control operacional por bodega y balanceo de carga.

El sistema implementa dos roles jerárquicos:
- **`supervisor_mayor`**: Tiene control global sobre la red de distribución. Puede consultar existencias y auditoría de todas las bodegas, crear pedidos, solicitar propuestas de balanceo automático y despachar desde cualquier bodega. Existe exactamente **1 supervisor mayor**.
- **`supervisor_menor`**: Administrador local atado exclusivamente a una bodega. Solo puede consultar las existencias de su bodega y únicamente puede despachar o registrar movimientos que involucren su bodega asignada (cualquier intento de operar sobre otra bodega es rechazado con HTTP 403). Existe exactamente **1 supervisor menor por bodega**.

### Usuarios de demostración (cargados en `npm run seed`)

| Usuario | Contraseña | Rol | Bodega Asignada |
|---|---|---|---|
| `carlos.mayor` | `mayor123` | `supervisor_mayor` | *(Global — Ninguna)* |
| `ana.norte` | `norte123` | `supervisor_menor` | Bodega Norte |
| `sergio.sur` | `sur123` | `supervisor_menor` | Bodega Sur |
| `camilo.central` | `central123` | `supervisor_menor` | Bodega Central |

### Límite de 3 Bodegas
El alcance del sistema está estrictamente dimensionado para una red de 3 bodegas. Si se intenta registrar una 4ª bodega vía `POST /api/bodegas`, el servidor responde con **HTTP 400**.

### Función de Balanceo Sugerido (`POST /api/pedidos/:id/sugerir-reparto`)
Permite al `supervisor_mayor` obtener una propuesta inteligente de cómo repartir un pedido entre las bodegas, priorizando aquellas con mayor excedente sobre su stock mínimo. **Nunca ejecuta el despacho automáticamente**, preservando el criterio de decisión humano.

---

## Cómo ejecutar desde cero

El proyecto puede probarse directamente en su [versión desplegada en la nube](https://stockflow-inventory-ufps.onrender.com/) o ejecutarse localmente.

Requisitos locales: [Node.js](https://nodejs.org/) ≥ 22 (para `npm test`; ≥ 18 basta para ejecutar) y Git.
Nada más (SQLite es un fichero local).

```bash
git clone https://github.com/vivianaorg14/stockflow-inventory.git
cd stockflow-inventory
npm install
npm run seed      # crea stockflow.sqlite con 3 bodegas, 5 productos, 1 pedido y 4 usuarios
npm start         # http://localhost:3000 (o el PORT de .env; plantilla en .env.example)
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador: interfaz con pestañas de
Existencias, Movimientos, Pedidos, Auditoría y Catálogo.

### Consulta obligatoria

> Existencias por producto y bodega, señalando las que están por debajo del mínimo.

```bash
curl http://localhost:3000/api/inventario/existencias
```

Devuelve una fila por par producto–bodega con `cantidad_actual`, `minimo` y `bajo_minimo`.
Con los datos del seed hay **4 filas** con `bajo_minimo: true`. Si la consulta la realiza un `supervisor_menor`, los resultados se filtran automáticamente a su bodega asignada.

### Endpoints

Todas las rutas cuelgan de **`/api`**.

| Método | Ruta | Rol requerido / Permisos | Qué hace |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Autenticación con usuario y contraseña; retorna token JWT |
| `GET` | `/api/auth/perfil` | Autenticado | Consulta datos y bodega del usuario en sesión |
| `GET` / `POST` | `/api/productos` | General / Mayor | Listar / crear productos |
| `PATCH` | `/api/productos/:id/descontinuar` | General / Mayor | Marcar producto descontinuado (R4) |
| `GET` / `POST` | `/api/bodegas` | General / Mayor | Listar / crear bodegas (máximo 3) |
| `GET` / `POST` | `/api/movimientos` | Filtrado por rol | Historial / registrar movimiento (menor restringido a su bodega) |
| `GET` | `/api/inventario/existencias` | Filtrado por rol | **Consulta obligatoria** (menor solo ve su bodega) |
| `GET` | `/api/inventario/auditoria` | `supervisor_mayor` | Auditoría de saldos vs historia (R3) |
| `PUT` | `/api/inventario/existencias/:prod/:bod/minimo` | Bodega propia / Mayor | Fijar stock mínimo por par producto-bodega |
| `GET` | `/api/pedidos` | General | Listar pedidos |
| `POST` | `/api/pedidos` | `supervisor_mayor` | Crear nuevo pedido |
| `POST` | `/api/pedidos/:id/sugerir-reparto` | `supervisor_mayor` | Sugerir balanceo de despacho entre bodegas (solo lectura) |
| `POST` | `/api/pedidos/:id/despachar` | Mayor o Menor (su bodega) | Despachar parcial o totalmente |
| `POST` | `/api/pedidos/:id/cancelar` | `supervisor_mayor` | Cancelar un pedido abierto |

## Cómo cumple el enunciado

| Regla | Cómo |
|---|---|
| R1 traslado descuenta origen, suma destino, nunca negativo | Transacción única; se rechaza si el origen no alcanza |
| R2 despacho desde varias bodegas | El despacho recibe una lista `{ item, bodega, cantidad }` ([ADR-006](docs/adr/ADR-006-asignacion-manual-de-bodegas.md)) |
| R3 saldo reconstruible desde la historia | Todo movimiento y despacho inserta en `movimientos`; nunca se edita ([ADR-003](docs/adr/ADR-003-inmutabilidad-movimientos.md)). Reconstrucción expuesta en `GET /api/inventario/auditoria`, detalle en [docs/02-dominio.md](docs/02-dominio.md) |
| R4 descontinuado: salidas sí, entradas no | `POST /api/movimientos` con `ENTRADA` → 400 |
| Consulta obligatoria | `GET /api/inventario/existencias`, mínimo por producto **y** bodega ([ADR-004](docs/adr/ADR-004-minimo-por-producto-y-bodega.md)) |

Trazabilidad completa requisito → código en [docs/02-dominio.md](docs/02-dominio.md).

## Stack

Node.js · Express 4 · Sequelize 6 · SQLite · frontend estático sin framework. Por qué:
[ADR-002](docs/adr/ADR-002-base-de-datos.md) y [ADR-013](docs/adr/ADR-013-frontend-estatico.md).
Arquitectura en [docs/01-arquitectura.md](docs/01-arquitectura.md).

## Dónde está cada cosa

```
stockflow-inventory/
├── index.js, seed.js, src/        código (modelos, rutas, controladores, servicios)
├── public/                        frontend estático (index.html, app.js, estilos.css)
├── tests/                         suite node:test + supertest (42 casos)
├── eslint.config.js               lint (ESLint flat config)
├── README.md                      esta portada
├── AGENTS.md · CLAUDE.md          contrato de arranque para agentes de IA (punteros a docs/)
├── ASSUMPTIONS.md                 resumen de asunciones AS-001..008 → su ADR
├── BITACORA-IA.md                 registro por sesión del trabajo con IA
└── docs/
    ├── 00-INDEX.md                índice maestro — empezar por aquí
    ├── 01-arquitectura.md         stack, capas, modelo de datos, invariantes
    ├── 02-dominio.md              reglas, ciclo del pedido, API completa, interfaz
    ├── 04-convenciones.md         reglas de código y documentación, pipeline N2
    ├── 05-runbook.md              comandos, curl de demo, gotchas
    ├── 06-pendientes.md           tareas abiertas con prioridad
    ├── 07-historial.md            changelog: qué / por qué / cómo revertir
    ├── 08-enunciado.md            enunciado literal del Sistema C
    ├── stockflow.postman_collection.json  colección Postman/Bruno de las peticiones de demo
    ├── adr/                       14 registros de decisión (MADR) + plantilla
    ├── superpowers/               specs y planes por feature
    └── _archivo/                  documentos congelados
```

## Documentación del proceso con IA

| Archivo | Contenido |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Contexto y reglas entregadas al agente |
| [`ASSUMPTIONS.md`](ASSUMPTIONS.md) | Decisiones sobre lo que el enunciado no define |
| [`BITACORA-IA.md`](BITACORA-IA.md) | Cada sesión: qué pedí, qué propuso, qué acepté, qué rechacé |
| [`docs/adr/`](docs/adr/README.md) | ADR-001 herramienta de IA · ADR-002 base de datos · ADR-003 inmutabilidad · ADR-004..011 asunciones y alcance · ADR-012..014 servicios de dominio, frontend y tipo `AJUSTE` · ADR-015 roles RBAC y balanceo · ADR-016 despliegue en Render |

## Limitaciones conocidas

- **Persistencia en el Free Tier de Render:** En el plan gratuito de Render, el disco local del contenedor es efímero entre *redeploys*; cada nuevo despliegue desde git reinicia el servicio y re-ejecuta el seed demo (`npm run seed`), restableciendo los datos a su estado inicial de prueba ([ADR-016](docs/adr/ADR-016-despliegue-en-render.md)).
- **Suspensión por inactividad en la nube:** Tras 15 minutos sin peticiones en Render Free, el servicio entra en reposo (*spin down*), demorando entre 30 y 50 segundos en reactivarse en la primera solicitud.
- **Sin reservas automáticas previas:** La disponibilidad de existencias se valida y descuenta al despachar, no al crear el pedido ([ADR-005](docs/adr/ADR-005-descuento-al-despachar.md)).
- **Cantidades estrictamente enteras:** No se admiten fracciones ni decimales ([ADR-009](docs/adr/ADR-009-cantidades-enteras.md)).
- **Deuda técnica y tareas futuras:** Detalladas en [docs/06-pendientes.md](docs/06-pendientes.md).

## Defensa oral — guía rápida

1. **Qué construí:** API + UI de inventario multibodega con movimientos inmutables, tipo
   `AJUSTE`, auditoría de saldos y despacho multifuente.
2. **Arquitectura:** Express + Sequelize + SQLite, reglas en `src/servicios/`, frontend estático
   en `public/` ([docs/01](docs/01-arquitectura.md)).
3. **Decisiones clave:** SQLite por ejecución desde cero; movimientos inmutables por R3;
   asignación manual de bodegas por alcance; servicios de dominio en vez de lógica en
   controladores. Cada una con alternativas en [`docs/adr/`](docs/adr/README.md).
4. **Uso de IA:** Antigravity para código y docs iniciales, Claude Code para la reorganización
   documental y para la v1 completa (servicios, tests, frontend, lint); cada sesión en
   [`BITACORA-IA.md`](BITACORA-IA.md).
5. **Demo:** la interfaz en `http://localhost:3000`, o los `curl` de
   [docs/05-runbook.md](docs/05-runbook.md) en orden.
6. **Preguntas probables:** §15 de [docs/_archivo/2026-09-18-analisis-asunciones.md](docs/_archivo/2026-09-18-analisis-asunciones.md)
   y las "notas para la defensa" de cada ADR.
