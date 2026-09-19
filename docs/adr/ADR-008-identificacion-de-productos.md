# ADR-008 — ID interno autoincremental + SKU único obligatorio

**Estado:** Aceptado
**Fecha:** 2026-09-18
**Decisores:** Viviana Ortiz Gáfaro
**Sustituye a / relacionado con:** formaliza AS-006 de [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md)

## Contexto y problema

El enunciado nombra la entidad `Producto` sin atributos. Hay que decidir cómo se identifica de
forma única y qué campos mínimos lleva.

## Factores de decisión

- Relaciones internas estables (FK) frente a identificación operativa legible.
- El nombre puede repetirse o cambiar: no sirve como clave.

## Alternativas consideradas

1. Solo ID interno.
2. Solo SKU único.
3. ID interno + SKU único.

## Decisión

Se elige **ID interno + SKU único**. Modelo mínimo: `id`, `sku`, `nombre`, `descripcion`,
`estado ∈ {ACTIVO, DESCONTINUADO}`.

### Consecuencias

- Positivas: FK por `id`; búsqueda y comunicación por `sku`.
- Negativas: dos identificadores que mantener coherentes.
- Obligaciones: `sku` único a nivel de base de datos y validado al crear; `estado` gobierna la
  regla "descontinuado no admite entradas".

## Pros y contras de las alternativas

### Solo ID

- ✅ Trivial.
- ❌ Inútil para el operador.

### Solo SKU

- ✅ Legible.
- ❌ Clave de negocio como PK: si el SKU cambia, se rompen las relaciones.

### ID + SKU (elegida)

- ✅ Separa identidad técnica de identidad comercial.
- ❌ Un campo más que validar.

## Evidencia en el código

Modelo `Producto` (`sku` con `unique: true`); `productosController.crear` rechaza SKU duplicado
con 400 antes de insertar.
