# 08 — Enunciado de la prueba (fuente de verdad de los requisitos)

Texto literal del sistema asignado. **No se edita**: contra esto se verifica todo lo demás.
Cómo se cumple cada punto: [02-dominio.md](02-dominio.md).

---

## Sistema C · Inventario con varias bodegas

Una distribuidora maneja tres bodegas y despacha pedidos desde cualquiera de ellas. El
inventario se lleva en una hoja de cálculo por bodega y nunca cuadra.

**Entidades mínimas:** Producto, bodega, existencia por bodega, movimiento (entrada, salida,
traslado), pedido.

**Reglas de negocio que el sistema debe respetar:**

- **R1.** Un traslado entre bodegas descuenta en origen y suma en destino, y no puede dejar la
  existencia en negativo.
- **R2.** Un pedido se puede despachar desde varias bodegas si ninguna tiene la cantidad
  completa.
- **R3.** Todo movimiento queda registrado de forma que el saldo actual se pueda reconstruir
  sumando la historia.
- **R4.** Un producto descontinuado admite salidas pero no entradas nuevas.

**Consulta obligatoria:** Existencias por producto y bodega, señalando las que están por debajo
del mínimo.

---

## Entregables del curso (documentación del proceso con IA)

Según [BITACORA-IA.md](../BITACORA-IA.md) sesión 1, la prueba exige además: `README.md`,
`AGENTS.md`, `ASSUMPTIONS.md`, `BITACORA-IA.md` y al menos tres ADR. Viven en la raíz del repo y
en [`adr/`](adr/README.md) respectivamente.
