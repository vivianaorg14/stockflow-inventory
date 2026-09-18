# AGENTS.md — StockFlow

> Este archivo describe el contexto entregado al agente de IA (Antigravity) durante el desarrollo del proyecto.  
> Debe evolucionar con el avance del sistema.

---

## Descripción del sistema

StockFlow es un sistema de gestión de inventario multibodega. El objetivo es construir un backend funcional que permita:

- Registrar productos con SKU único y estado (activo / descontinuado).
- Gestionar bodegas y las existencias de cada producto por bodega.
- Registrar movimientos (entrada, salida, traslado) de forma inmutable.
- Crear pedidos y despacharlos desde una o varias bodegas.
- Consultar existencias e identificar cuáles están por debajo del mínimo.

---

## Stack definido

- **Lenguaje:** JavaScript (Node.js)
- **Framework:** Express
- **Base de datos:** SQLite
- **ORM:** Sequelize
- **Entorno:** local, sin Docker

---

## Entidades del dominio

```
Producto
  id (PK, autoincremento)
  sku (único, obligatorio)
  nombre
  descripcion
  estado: 'ACTIVO' | 'DESCONTINUADO'

Bodega
  id (PK, autoincremento)
  nombre
  ubicacion

ExistenciaPorBodega
  id (PK)
  producto_id (FK → Producto)
  bodega_id (FK → Bodega)
  cantidad_actual (entero ≥ 0)
  minimo (entero ≥ 0)

Movimiento
  id (PK)
  tipo: 'ENTRADA' | 'SALIDA' | 'TRASLADO'
  producto_id (FK → Producto)
  bodega_origen_id (FK → Bodega, nullable)
  bodega_destino_id (FK → Bodega, nullable)
  cantidad (entero > 0)
  fecha
  referencia (texto libre, opcional)
  notas

Pedido
  id (PK)
  descripcion
  estado: 'PENDIENTE' | 'PARCIALMENTE_DESPACHADO' | 'COMPLETADO' | 'CANCELADO'
  fecha_creacion

ItemPedido
  id (PK)
  pedido_id (FK → Pedido)
  producto_id (FK → Producto)
  cantidad_solicitada
  cantidad_despachada
```

---

## Reglas de negocio (invariantes del dominio)

1. Un traslado descuenta la bodega de origen y suma a la de destino. **Nunca puede resultar en existencia negativa.**
2. Un producto con estado `DESCONTINUADO` **no puede recibir entradas** (tipo `ENTRADA`). Sí puede tener salidas y traslados de salida.
3. Todo movimiento confirmado es **inmutable**. Las correcciones se hacen con nuevos movimientos de ajuste.
4. Un pedido puede despacharse en varias partes (**despacho parcial**). La suma despachada nunca supera la cantidad solicitada.
5. Las cantidades son **enteros positivos**. No se permiten fracciones.
6. La asignación de bodegas para despacho es **manual** (el usuario indica qué cantidad sale de qué bodega).

---

## Consulta obligatoria (endpoint de entrega)

```
GET /inventario/existencias
```

Devuelve todas las combinaciones `producto × bodega` con:
- `cantidad_actual`
- `minimo`
- `bajo_minimo` (boolean: `cantidad_actual < minimo`)

---

## Contexto para el agente — instrucciones de comportamiento

Cuando el agente genere código para este proyecto, debe:

1. Usar **Sequelize** para definir modelos y relaciones, no SQL crudo.
2. Validar las reglas de negocio en la capa de controlador antes de persistir.
3. Retornar errores descriptivos en JSON (`{ error: "..." }`).
4. No permitir que ningún campo de cantidad quede en negativo.
5. Mantener los movimientos como registros de solo inserción (no actualizar ni eliminar).
6. Comentar el código en **español**.
7. El seed debe crear al menos: 3 bodegas, 5 productos (1 descontinuado), existencias iniciales y 1 pedido de prueba.

---

## Historial de contexto entregado

### Sesión 1 — 2026-09-18

**Contexto inicial entregado:**
- Enunciado completo del Sistema C.
- Descripción de entidades, reglas y consulta obligatoria.
- Decisión de stack: Node.js + Express + SQLite + Sequelize.
- Instrucción de generar documentación MD (README, AGENTS.md, ASSUMPTIONS.md, BITACORA-IA.md, ADRs).

**Evolución pendiente:**
- Agregar contexto de código cuando se inicie la implementación.
- Actualizar si se cambia alguna regla de negocio durante el desarrollo.
