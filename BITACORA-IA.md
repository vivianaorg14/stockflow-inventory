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

- Leer los archivos existentes antes de generar nada, para no duplicar trabajo ni contradeckir decisiones ya tomadas.
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

## Sesión 2 — (pendiente)

> Esta entrada se completará en la próxima sesión de trabajo.

**Herramienta usada:**  
**Objetivo de la sesión:**

### Qué pedí

### Qué propuso el agente

### Qué acepté

### Qué rechacé / modifiqué

### Aprendizajes de la sesión

---

## Sesión 3 — (pendiente)

> Esta entrada se completará en la próxima sesión de trabajo.

**Herramienta usada:**  
**Objetivo de la sesión:**

### Qué pedí

### Qué propuso el agente

### Qué acepté

### Qué rechacé / modifiqué

### Aprendizajes de la sesión
