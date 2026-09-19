# 04 — Convenciones (obligatorias)

Estas reglas no son sugerencias. Aplican a personas y a agentes por igual.
Cambiar una regla de acá es una decisión explícita (un ADR), no un efecto colateral de otro trabajo.

Base global: `~/.claude/dev-rules.md` (código) y `~/.claude/docs-protocol.md` (documentación).
Acá va sólo lo propio de este repo y las **excepciones declaradas**.

---

# Parte A — Reglas de documentación

## A.1 Ciclo obligatorio por cambio

**ANTES** — leer [00-INDEX.md](00-INDEX.md) y [06-pendientes.md](06-pendientes.md).
Feature nueva o cambio de regla de dominio: **primero spec, después plan**
(`superpowers/specs/AAAA-MM-DD-<slug>-design.md` → `superpowers/plans/AAAA-MM-DD-<slug>.md`,
una tarea = un commit). Una decisión con alternativas → ADR en [`adr/`](adr/README.md).
Un fix chico no necesita spec; si dudás, lo necesita.

**DURANTE** — un cambio de riesgo a la vez · `npm run seed` antes de probar a mano (deja la base
en estado conocido) · nada se da por bueno sin evidencia real (salida de `curl`, tests).

**DESPUÉS** — estado en `01`–`05` si cambió el AHORA · entrada en
[07-historial.md](07-historial.md) (qué · por qué · cómo revertir) ·
[06-pendientes.md](06-pendientes.md) actualizado · comandos nuevos a [05-runbook.md](05-runbook.md)
· **sesión con IA registrada en [`../BITACORA-IA.md`](../BITACORA-IA.md)** (entregable del curso).

## A.2 Reglas de escritura

Fechas absolutas · un archivo = un propósito (~200 líneas) · no duplicar · corto ·
estado ≠ historial ≠ pendientes · nombres de función en vez de `archivo:línea`.
El enunciado ([08-enunciado.md](08-enunciado.md)) y los ADR aceptados **no se reescriben**; se
añade una nota fechada o un ADR nuevo.

## A.3 Entregables del curso que viven en la raíz

`README.md`, `AGENTS.md`, `ASSUMPTIONS.md`, `BITACORA-IA.md` son exigidos por la prueba con ese
nombre y ubicación. Se mantienen, pero como **punteros o resúmenes**: el detalle vive en `docs/`.
`ASSUMPTIONS.md` es la tabla resumen de las decisiones AS-NNN; cada una tiene su ADR.

## A.4 Prohibiciones

- ❌ Estado de sesión o pendientes en `CLAUDE.md` / `AGENTS.md` (van a `06`/`07`/bitácora).
- ❌ Duplicar el mismo bloque en `CLAUDE.md` y `AGENTS.md`.
- ❌ Documentar una ruta sin el prefijo `/api` (ya pasó: README v1).
- ❌ Enlazar documentos que no existen. ❌ Editar `_archivo/`. ❌ Renumerar documentos.
- ❌ Cerrar un pendiente sin evidencia.
- ❌ La UI no valida reglas de negocio: envía y muestra el `error` de la API; la regla vive en
  el servicio ([ADR-013](adr/ADR-013-frontend-estatico.md)).

---

# Parte B — Reglas de código

## B.1 Innegociables del stack

- Sequelize para todo acceso a datos; **nada de SQL crudo**.
- Todo cambio que toque más de una tabla va en **una** `sequelize.transaction()`.
- `movimientos` es **solo inserción**: nunca `PUT`/`DELETE`, nunca `update()` sobre `Movimiento`
  ([ADR-003](adr/ADR-003-inmutabilidad-movimientos.md)).
- Ninguna cantidad negativa se persiste; cantidades enteras > 0 en toda entrada
  ([ADR-009](adr/ADR-009-cantidades-enteras.md)).
- Errores en JSON `{ error: "…" }`: 400 regla/entrada, 404 no existe, 500 resto.
- Comentarios y nombres en **español**.
- `stockflow.sqlite` y `node_modules/` no se commitean.

## B.2 Dominio: fuente única de verdad

> **Concepto derivado = un dueño de código. Nadie recalcula; todos llaman.**

Dueños actuales en la tabla de invariantes de [01-arquitectura](01-arquitectura.md). Al añadir
una regla, elegir su dueño y anotarlo allí. Antes de mover lógica existente: **tests de
caracterización primero** — la suite vive en `tests/` (`npm test`).

## B.3 Flujo de trabajo por cambio

1. TDD: test que falla → implementación → verde.
2. Pipeline del nivel declarado (Parte C) verde antes de commitear.
3. Commit chico, Conventional Commits con scope: `feat(movimientos):`, `fix(pedidos):`, `docs:`.
4. Refactor puro = sin cambio de comportamiento observable. Divergencia → parar y consultar.

---

# Parte C — Pipeline de verificación

**Nivel declarado hoy: N2.** Lint + tests + cobertura con umbral, encadenados en un único comando:

| Paso | Comando | Estado |
|---|---|---|
| Lint | `npm run lint` | N1 · obligatorio — ESLint flat config (`eslint.config.js`), `js.configs.recommended` |
| Tests unitarios / integración | `npm test` | N1 · obligatorio — `node:test` + `supertest`, `tests/*.test.js` |
| Cobertura con umbral | `npm run test:cov` (`c8` sobre `src/**` y `seed.js`) | N2 — umbrales reales del 2026-09-18: líneas 90 %, funciones 90 %, ramas 80 %, sentencias 90 % (la suite de 42 casos dio 98.59 % líneas / 100 % funciones / 89.7 % ramas / 98.59 % sentencias; umbrales fijados en el valor pedido, no en el real, porque el real ya lo superaba) |
| Pipeline completo | `npm run verify` (`lint && test:cov`) | N2 — obligatorio antes de commitear |

Subir de nivel es una tarea con su ficha en [06-pendientes.md](06-pendientes.md), no un
efecto colateral. **Nunca** bajar un umbral ni desactivar un test para que pase el build.

## Excepciones declaradas frente a las reglas globales

| Regla global | Excepción en este repo | Motivo |
|---|---|---|
| Cambio de esquema = migración versionada | `sequelize.sync()` / `sync({ force })` en seed | SQLite local de demo, sin datos que preservar |
| `CLAUDE.md`/`AGENTS.md` sin nada más que punteros | `AGENTS.md` lleva además las instrucciones de comportamiento para el agente que exige el curso | Entregable del curso; se mantiene corto |
