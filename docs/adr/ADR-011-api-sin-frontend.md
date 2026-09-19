# ADR-011 — API REST sin frontend en la primera versión

**Estado:** Sustituido por [ADR-013](ADR-013-frontend-estatico.md) el 2026-09-18
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** decisión registrada en la sesión 1 de [`BITACORA-IA.md`](../../BITACORA-IA.md) (rechazo del frontend React propuesto por el agente)

## Contexto y problema

El agente de IA propuso un frontend en React. El plazo es una semana y el enunciado exige
persistencia, reglas de negocio y una consulta obligatoria; la interfaz puede ser la propia API.

## Factores de decisión

- Plazo de una semana.
- Qué evalúa la prueba: reglas y trazabilidad, no UI.
- Que el evaluador pueda ejecutar y probar desde cero.

## Alternativas consideradas

1. API REST probada con `curl` / cliente HTTP.
2. API + frontend React.
3. API + vistas servidas por Express (HTML mínimo).

## Decisión

Se elige **API REST sin frontend**. La "interfaz" es la API JSON más la colección de peticiones
del runbook.

### Consecuencias

- Positivas: todo el tiempo va al dominio.
- Negativas: la demo en la defensa se hace con `curl` o Postman; contradice la regla global de
  este PC "toda feature incluye su frontend" → excepción declarada en
  [04-convenciones](../04-convenciones.md).
- Obligaciones: el runbook debe traer las peticiones listas para copiar y pegar.

## Pros y contras de las alternativas

### Solo API (elegida)

- ✅ Mínimo código; fácil de ejecutar desde cero.
- ❌ Demo menos vistosa.

### API + React

- ✅ Demo visual.
- ❌ Segundo proyecto que mantener; no lo pide el enunciado.

### Vistas en Express

- ✅ Sin segundo proyecto.
- ❌ Mezcla presentación con API en el mismo servidor; tiempo que no sobra.

## Evidencia en el código

`index.js` sirve solo JSON; no hay carpeta `public/` ni motor de vistas.
