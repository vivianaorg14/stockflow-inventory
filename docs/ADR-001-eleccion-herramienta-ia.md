# ADR-001 — Elección de herramienta de inteligencia artificial

**Estado:** Aceptado  
**Fecha:** 2026-09-18  
**Autora:** Viviana Ortiz

---

## Contexto

La prueba técnica exige el uso de una herramienta de IA y su declaración explícita en la bitácora. Las opciones disponibles sin costo son:

| Herramienta | Modalidad |
|---|---|
| GitHub Copilot (estudiantes) | Autocompletado + créditos mensuales |
| **Antigravity** | Entorno con agente, gratuito en preview |
| Codex (ChatGPT) | Chat gratuito en navegador |
| Claude | Chat gratuito en navegador |

El objetivo es un sistema backend funcional con un flujo completo end-to-end en una semana.

---

## Decisión

Se elige **Antigravity** como herramienta principal de IA para el desarrollo de StockFlow.

---

## Alternativas consideradas

### Opción A — GitHub Copilot
- **Ventaja:** integrado al editor, autocompletado en tiempo real.
- **Desventaja:** requiere cuenta de estudiante verificada. El modo agente (no solo autocompletado) requiere Copilot Chat, que tiene límite de mensajes en el plan gratuito.
- **Razón de descarte:** el modo de trabajo preferido es entregar contexto completo del dominio y recibir propuestas de estructura, no solo completar línea a línea.

### Opción B — Codex / ChatGPT
- **Ventaja:** accesible sin instalación.
- **Desventaja:** no tiene acceso directo al sistema de archivos ni puede ejecutar comandos. Cada intercambio requiere copiar y pegar el código manualmente.
- **Razón de descarte:** el ciclo copiar-pegar introduce errores y ralentiza el flujo de trabajo.

### Opción C — Claude (navegador)
- **Ventaja:** buena comprensión de contexto largo.
- **Desventaja:** igual que Codex, no tiene acceso al entorno local. Límite de mensajes en el plan gratuito.
- **Razón de descarte:** las mismas limitaciones de integración con el entorno local.

### Opción D — Antigravity ✅ (elegida)
- **Ventaja:** agente con acceso al sistema de archivos, puede leer código existente, crear archivos, ejecutar comandos y mantener contexto entre pasos.
- **Ventaja:** permite entregar el contexto del dominio una sola vez (en `AGENTS.md`) y que el agente lo use en todas las interacciones posteriores.
- **Desventaja:** entorno en preview, puede tener comportamientos inesperados.
- **Razón de elección:** es el único que puede operar como agente real de desarrollo: lee, escribe, ejecuta y razona sobre el proyecto completo.

---

## Consecuencias

- Antigravity se declara como herramienta principal en `AGENTS.md` y en cada entrada de `BITACORA-IA.md`.
- Cada sesión documenta qué se pidió, qué propuso el agente y qué se aceptó o rechazó.
- La autora es responsable de revisar y entender todo el código generado antes de hacer commit.
- Si Antigravity genera algo incorrecto (viola una regla de negocio, crea deuda técnica), la responsabilidad de detectarlo y corregirlo es de la autora.

---

## Notas para la defensa oral

> **Pregunta probable:** ¿Por qué usaste Antigravity y no Copilot que es más conocido?

**Respuesta preparada:** Copilot es muy útil para autocompletar mientras escribo, pero Antigravity opera como agente: puede leer mis archivos, entender el modelo del dominio que describí en `AGENTS.md` y proponer estructuras completas. Para un proyecto de una semana donde el diseño importa tanto como el código, preferí una herramienta que pudiera razonar sobre el sistema completo, no solo completar la línea que estoy escribiendo.
