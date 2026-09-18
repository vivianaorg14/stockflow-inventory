# ASSUMPTIONS.md — StockFlow

> Este documento registra decisiones de diseño tomadas para resolver aspectos no definidos explícitamente en el enunciado. Las decisiones deben revisarse durante la implementación y actualizarse si cambian.

## AS-001. Mínimo de inventario

- **Pregunta:** ¿El mínimo es global por producto o específico por bodega?
- **Alternativas:** mínimo global; mínimo por producto y bodega; mínimo global con sobrescritura.
- **Decisión propuesta:** mínimo específico por producto y bodega.
- **Justificación:** permite generar alertas más precisas para cada ubicación.
- **Consecuencias:** la relación de existencia debe almacenar el mínimo correspondiente.

## AS-002. Momento de descuento

- **Pregunta:** ¿Se descuenta al crear el pedido o al confirmar el despacho?
- **Alternativas:** descuento al crear; descuento al confirmar; reserva al crear y descuento al despachar.
- **Decisión propuesta:** descontar al confirmar el despacho.
- **Justificación:** se separa la solicitud del movimiento físico de salida.
- **Consecuencias:** se debe validar la disponibilidad nuevamente al confirmar el despacho. Las reservas avanzadas quedan fuera de la primera versión.

## AS-003. Asignación de bodegas

- **Pregunta:** ¿La asignación es manual o automática?
- **Alternativas:** manual; automática; propuesta automática con confirmación.
- **Decisión propuesta:** asignación manual.
- **Justificación:** permite demostrar el despacho multibodega sin incorporar un algoritmo logístico no exigido.
- **Consecuencias:** el sistema debe validar la disponibilidad por bodega y la suma de las cantidades asignadas.

## AS-004. Pedidos parciales

- **Pregunta:** ¿Se permiten despachos parciales?
- **Alternativas:** solo pedidos completos; pedidos parcialmente despachados; parciales bajo condiciones.
- **Decisión propuesta:** permitir despachos parciales.
- **Justificación:** permite conservar la cantidad pendiente y realizar varios despachos.
- **Consecuencias:** se deben controlar cantidades solicitadas, despachadas y pendientes, además de estados del pedido.

## AS-005. Edición de movimientos

- **Pregunta:** ¿Se pueden modificar o eliminar movimientos confirmados?
- **Alternativas:** editar/eliminar; hacer movimientos inmutables; reversión controlada.
- **Decisión propuesta:** no editar ni eliminar movimientos confirmados. Corregir mediante nuevos movimientos de ajuste o reversión.
- **Justificación:** protege la trazabilidad y la reconstrucción del saldo.
- **Consecuencias:** las correcciones deben conservar el movimiento original y registrar el motivo cuando corresponda.

## AS-006. Identificación de productos

- **Pregunta:** ¿Qué atributos mínimos tendrá el producto?
- **Alternativas:** solo ID; SKU; ID interno más SKU.
- **Decisión propuesta:** ID interno generado automáticamente y SKU único obligatorio.
- **Atributos mínimos:** ID, SKU, nombre, descripción y estado.
- **Justificación:** el ID facilita las relaciones y el SKU facilita la identificación operativa.
- **Consecuencias:** el SKU no puede repetirse y el estado debe controlar las entradas de productos descontinuados.

## AS-007. Cantidades

- **Pregunta:** ¿Se permiten cantidades decimales?
- **Alternativas:** enteras; decimales; según unidad de medida.
- **Decisión propuesta:** cantidades enteras positivas.
- **Justificación:** reduce la complejidad de validación en la primera versión.
- **Consecuencias:** no se permiten fracciones, peso, volumen ni conversiones de unidades en el alcance inicial.

## AS-008. Usuarios y permisos

- **Pregunta:** ¿Habrá usuario general o permisos por bodega?
- **Alternativas:** usuario general; roles generales; permisos por bodega.
- **Decisión propuesta:** acceso general o usuario de demostración en la primera versión.
- **Justificación:** la prueba prioriza las reglas de inventario y deja la autenticación avanzada fuera del alcance general.
- **Consecuencias:** los permisos detallados por bodega quedan como mejora futura y no se debe afirmar que existe seguridad avanzada si no fue implementada.

## Decisiones relacionadas

- El momento de descuento afecta los pedidos parciales.
- La asignación de bodegas afecta los movimientos de salida.
- La inmutabilidad de movimientos protege la reconstrucción del saldo.
- El mínimo por bodega afecta la consulta obligatoria.
- Las cantidades enteras simplifican las validaciones.
- Los permisos por bodega podrían afectar los traslados entre ubicaciones.

## Fuera de alcance inicial

- Autenticación avanzada.
- Permisos detallados por bodega.
- Algoritmos de optimización logística.
- Rutas y costos de transporte.
- Reservas avanzadas con vencimiento.
- Lotes, vencimientos y números de serie.
- Conversión de unidades.
- Integraciones externas.
- Despliegue productivo.
- Pagos reales.
