# 00 — Índice maestro · StockFlow

**Leer PRIMERO en cada sesión, junto con [06-pendientes](06-pendientes.md).**
Última actualización: 2026-09-18.

## Resumen en 30 segundos

StockFlow es la solución al **Sistema C — Inventario con varias bodegas** de la prueba técnica
del curso *Herramientas de Empleabilidad en Ingeniería de Sistemas* (autora: Viviana Ortiz
Gáfaro). Enunciado literal en [08-enunciado](08-enunciado.md). Estado: **funcional, con UI y
suite N2 (cobertura con umbral)** — R1–R4 y la consulta obligatoria son demostrables sin `curl`.

API + UI en **Node.js + Express + Sequelize + SQLite**, todo local:
`npm install && npm run seed && npm start` → `http://localhost:3000` (UI) y
`http://localhost:3000/api/...` (JSON).

Calidad verificada el 2026-09-18 con `npm run verify` (lint + tests + cobertura): **42/42 tests,
lint sin salida, cobertura 98.59 % líneas / 89.7 % ramas / 100 % funciones / 98.59 % sentencias**
(umbrales 90/80/90/90) — pipeline **N2**. Detalle y baseline en [05-runbook](05-runbook.md);
huecos en [06-pendientes](06-pendientes.md).

Trabajo en curso: ninguno; abierto sólo `DOC-01` (la autora debe completar su sección de
`BITACORA-IA.md`) — ver [06-pendientes](06-pendientes.md).

## Mapa de la documentación

| Archivo | Rol | Cuándo se toca |
|---|---|---|
| [00-INDEX.md](00-INDEX.md) | Este índice: resumen + mapa | Cuando cambia la estructura de docs |
| [01-arquitectura.md](01-arquitectura.md) | Stack, capas, modelo de datos, dueños de cada invariante | Cuando cambia una decisión técnica |
| [02-dominio.md](02-dominio.md) | Trazabilidad enunciado → código, reglas, ciclo del pedido, tabla de endpoints | Cuando cambia una regla o un endpoint |
| [04-convenciones.md](04-convenciones.md) | **Reglas de código y de documentación (obligatorias)**, nivel de pipeline, excepciones | Casi nunca; cambiar una regla es un ADR |
| [05-runbook.md](05-runbook.md) | Comandos, `curl` de demo para la defensa, gotchas | Cuando cambia un comando |
| [06-pendientes.md](06-pendientes.md) | **Tareas abiertas** con prioridad y evidencia | En cada sesión |
| [07-historial.md](07-historial.md) | **Changelog**: qué, por qué, cómo revertir | Tras cada cambio relevante |
| [08-enunciado.md](08-enunciado.md) | Enunciado literal del Sistema C. **No se edita** | Nunca |

### Subcarpetas

| Carpeta | Contenido |
|---|---|
| [`adr/`](adr/README.md) | Registros de decisión (MADR). 14 ADR aceptados; plantilla y reglas en su README |
| `superpowers/specs/` · `plans/` · `notes/` | Diseño y planes por feature, fechados. Índice en [superpowers/README.md](superpowers/README.md) |
| [`_archivo/`](_archivo/README.md) | Fotos congeladas (el análisis largo de asunciones). **No editar** |

### Fuera de `docs/` (entregables del curso, en la raíz)

| Archivo | Rol |
|---|---|
| [`../README.md`](../README.md) | Portada para el evaluador: qué es, cómo ejecutar, dónde está cada cosa |
| [`../AGENTS.md`](../AGENTS.md) · [`../CLAUDE.md`](../CLAUDE.md) | Contrato de arranque para agentes: reglas duras + punteros acá |
| [`../ASSUMPTIONS.md`](../ASSUMPTIONS.md) | Tabla resumen AS-001..008 → su ADR |
| [`../BITACORA-IA.md`](../BITACORA-IA.md) | Registro por sesión del trabajo con IA (exigido por la prueba) |

### Código (fuera de `docs/`, referencia rápida)

| Carpeta | Contenido |
|---|---|
| `../public/` | Frontend estático (`index.html`, `app.js`, `estilos.css`); detalle en [02-dominio](02-dominio.md#interfaz-public) |
| `../tests/` | Suite `node:test` + `supertest`, 42 casos; comandos en [05-runbook](05-runbook.md) |

## Regla de oro de esta documentación

**Un hecho vive en un solo sitio.** Requisitos en `08`, decisiones en `adr/`, estado en
`01`–`05`, lo abierto en `06`, lo hecho en `07`. Los demás enlazan, no repiten. Detalle en
[04-convenciones](04-convenciones.md).

> **Números vacantes:** `03` no se usa (no hay subsistema con vida propia). Los números no se
> reciclan.
