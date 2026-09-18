# StockFlow — Análisis de asunciones del sistema

## 1. Contexto

StockFlow es un sistema de gestión de inventario multibodega para una distribuidora que opera con tres bodegas y despacha pedidos desde cualquiera de ellas.

El enunciado exige las siguientes entidades mínimas:

- Producto.
- Bodega.
- Existencia por bodega.
- Movimiento: entrada, salida y traslado.
- Pedido.

También exige cumplir estas reglas:

1. Un traslado descuenta unidades en la bodega de origen y las suma en la bodega de destino, sin permitir existencias negativas.
2. Un pedido puede despacharse desde varias bodegas cuando ninguna tiene la cantidad completa.
3. Todo movimiento debe quedar registrado de forma que el saldo pueda reconstruirse a partir de la historia.
4. Un producto descontinuado admite salidas, pero no nuevas entradas.

La prueba no define todos los detalles operativos. Por eso, este documento registra alternativas y decisiones de diseño para evitar ambigüedades.

---

## 2. Criterios usados para analizar las asunciones

Cada alternativa se evalúa según:

- Coherencia con las reglas del enunciado.
- Complejidad de implementación.
- Facilidad de prueba.
- Trazabilidad e integridad de los datos.
- Capacidad de explicar la decisión durante la defensa.
- Compatibilidad con el plazo de una semana.

---

## 3. AS-001. Mínimo de inventario

### Pregunta

¿El mínimo de inventario es global por producto o diferente para cada bodega?

### Alternativas

#### Alternativa A: mínimo global por producto

Cada producto tiene un único valor mínimo aplicado a todas las bodegas.

**Ventajas**
- Modelo sencillo.
- Fácil de configurar y consultar.
- Menor cantidad de datos.

**Desventajas**
- No representa las necesidades particulares de cada bodega.
- Puede generar alertas poco precisas cuando las bodegas tienen demandas diferentes.

#### Alternativa B: mínimo por producto y bodega

Cada relación entre producto y bodega tiene su propio mínimo.

**Ventajas**
- Permite establecer umbrales diferentes según la demanda o función de cada bodega.
- La alerta identifica con precisión dónde existe bajo inventario.
- Se adapta mejor a un escenario multibodega.

**Desventajas**
- Requiere guardar el mínimo en la relación de existencia.
- Se debe definir qué ocurre si el mínimo no está configurado.

#### Alternativa C: mínimo global con sobrescritura por bodega

El producto tiene un mínimo general, pero una bodega puede definir un valor diferente.

**Ventajas**
- Ofrece flexibilidad.
- Permite utilizar un valor predeterminado.

**Desventajas**
- Introduce una regla de prioridad entre el mínimo global y el específico.
- Aumenta la complejidad de configuración.

### Decisión propuesta para evaluar

Usar un mínimo específico por producto y bodega.

### Justificación propuesta

La consulta obligatoria debe mostrar las existencias por producto y bodega y señalar cuáles están por debajo del mínimo. Un mínimo específico por bodega permite que la alerta represente mejor la situación de cada ubicación.

### Consecuencias

- La entidad o relación `Existencia` debe almacenar `minimo`.
- La consulta compara `cantidad_actual` con `minimo`.
- Se debe validar que el mínimo sea mayor o igual a cero.
- Se debe definir un valor predeterminado o exigir su configuración.

---

## 4. AS-002. Momento de descuento del inventario

### Pregunta

¿El inventario se descuenta al crear el pedido o al confirmar el despacho?

### Conceptos

- Crear pedido: registrar la solicitud.
- Reservar: comprometer unidades para un pedido.
- Confirmar despacho: registrar la salida física.

### Alternativa A: descontar al crear el pedido

**Ventajas**
- Reduce el riesgo de comprometer las mismas unidades en varios pedidos.
- El pedido afecta de inmediato la disponibilidad.

**Desventajas**
- Se confunde una solicitud con una salida física.
- Requiere manejar cancelaciones y posibles devoluciones.
- Puede dificultar la reconstrucción del inventario si no se diferencian reservas y salidas.

### Alternativa B: descontar al confirmar el despacho

**Ventajas**
- El movimiento de salida representa una operación física.
- Separa el pedido de la salida real.
- Es conceptualmente claro.

**Desventajas**
- Sin reservas, varios pedidos podrían comprometer la misma existencia.
- Se debe verificar nuevamente la disponibilidad al despachar.

### Alternativa C: reservar al crear y descontar al despachar

**Ventajas**
- Distingue inventario físico, reservado y disponible.
- Permite gestionar pedidos pendientes.
- Evita comprometer dos veces las mismas unidades si se implementa correctamente.

**Desventajas**
- Es más complejo.
- Requiere gestionar cancelaciones, cambios y vencimiento de reservas.
- Se deben evitar descuentos duplicados.

### Decisión propuesta para evaluar

Para una primera versión sencilla, descontar al confirmar el despacho y validar la disponibilidad en ese momento. Los pedidos que no puedan cubrirse deberán quedar pendientes o ser rechazados según la regla definida para pedidos parciales.

### Justificación propuesta

Esta opción permite que los movimientos de salida representen despachos confirmados y evita registrar como salida una solicitud que todavía no se ha realizado físicamente. La decisión requiere aceptar que, sin un mecanismo de reserva, puede existir competencia entre pedidos pendientes.

### Consecuencias

- Crear un pedido no modifica directamente la existencia.
- Confirmar un despacho genera movimientos de salida.
- La disponibilidad debe verificarse nuevamente al confirmar.
- Se debe definir el comportamiento cuando ya no hay suficiente inventario.
- Las reservas quedan fuera de la primera versión, salvo que se decida implementarlas explícitamente.

---

## 5. AS-003. Asignación de bodegas

### Pregunta

¿El usuario asigna las bodegas o el sistema distribuye las cantidades automáticamente?

### Alternativa A: asignación manual

El usuario selecciona la bodega y la cantidad que aporta.

**Ventajas**
- Es explícita y fácil de comprender.
- Permite tener en cuenta condiciones operativas no modeladas.
- Tiene menor complejidad algorítmica.

**Desventajas**
- Aumenta el trabajo del usuario.
- Requiere validar que no se supere la existencia disponible.
- La suma asignada debe coincidir con la cantidad despachada.

### Alternativa B: asignación automática

El sistema selecciona las bodegas mediante un criterio.

Criterios posibles:
- Mayor existencia disponible.
- Prioridad configurada.
- Menor número de bodegas utilizadas.
- Orden fijo de prioridad.
- Cercanía al destino, si se almacena esa información.

**Ventajas**
- Reduce el trabajo manual.
- Permite automatizar el proceso.

**Desventajas**
- Se debe definir y justificar el algoritmo.
- Aumenta los casos de prueba.
- Los criterios logísticos pueden quedar fuera del alcance.

### Alternativa C: propuesta automática con confirmación manual

El sistema propone una distribución y el usuario la confirma o modifica.

**Ventajas**
- Combina automatización y control humano.
- Permite revisar la distribución antes del despacho.

**Desventajas**
- Requiere implementar la propuesta y la edición.
- Tiene más complejidad que una asignación completamente manual.

### Decisión propuesta para evaluar

Usar asignación manual para la primera versión.

### Justificación propuesta

La asignación manual permite demostrar el despacho desde varias bodegas sin introducir un algoritmo logístico que no está exigido por el enunciado. El sistema debe validar que cada cantidad sea positiva, que no supere la disponibilidad de la bodega y que la suma de las cantidades asignadas sea coherente con el despacho.

### Consecuencias

- El usuario selecciona las bodegas participantes.
- Se deben validar las existencias de cada bodega.
- Se debe impedir asignar más unidades de las disponibles.
- El sistema no calculará rutas, costos, distancias ni prioridades logísticas.
- La automatización podrá quedar como mejora futura.

---

## 6. AS-004. Pedidos parciales

### Pregunta

¿Se permiten pedidos parcialmente despachados o solo pedidos completos?

### Alternativa A: únicamente pedidos completos

El pedido solo se confirma cuando se despacha toda la cantidad solicitada.

**Ventajas**
- Flujo sencillo.
- Menos estados.
- Facilita el seguimiento.

**Desventajas**
- Las unidades disponibles podrían no aprovecharse.
- Se debe definir qué ocurre con la cantidad faltante.
- No representa entregas en varias etapas.

### Alternativa B: permitir pedidos parcialmente despachados

Un pedido puede recibir varios despachos hasta completar su cantidad.

**Ventajas**
- Permite despachar lo disponible.
- Se adapta a varias bodegas y a entregas en diferentes momentos.
- Mantiene una cantidad pendiente.

**Desventajas**
- Requiere controlar cantidades solicitadas, despachadas y pendientes.
- Se deben impedir despachos superiores a la cantidad pendiente.
- Requiere estados adicionales.

### Alternativa C: permitir parciales con condiciones

Se permiten despachos parciales bajo condiciones, por ejemplo, confirmación del usuario o fecha límite.

**Ventajas**
- Mayor control operativo.

**Desventajas**
- Añade reglas y casos de prueba.

### Decisión propuesta para evaluar

Permitir pedidos parcialmente despachados y conservar la cantidad pendiente.

### Justificación propuesta

El enunciado contempla despachos desde varias bodegas. Permitir despachos parciales ofrece un comportamiento coherente con un escenario en el que la cantidad total no está disponible en un solo momento. El sistema debe mostrar la cantidad solicitada, despachada y pendiente.

### Consecuencias

Se pueden manejar estados como:

- `PENDIENTE`.
- `PARCIALMENTE_DESPACHADO`.
- `COMPLETADO`.
- `CANCELADO`.

La cantidad pendiente se calcula así:

`cantidad_pendiente = cantidad_solicitada - cantidad_despachada`

El sistema debe impedir que la cantidad total despachada supere la cantidad solicitada.

---

## 7. AS-005. Edición de movimientos confirmados

### Pregunta

¿Se pueden modificar o eliminar movimientos confirmados?

### Alternativa A: editar o eliminar

**Ventajas**
- Corrección directa de errores.
- Interfaz aparentemente sencilla.

**Desventajas**
- Se pierde la historia original.
- Puede afectar la reconstrucción del saldo.
- Puede generar inconsistencias en traslados.
- Se dificulta la auditoría.

### Alternativa B: movimientos inmutables

Una vez confirmado, un movimiento no se modifica ni elimina. Los errores se corrigen con un nuevo movimiento de ajuste.

**Ventajas**
- Conserva la historia.
- Favorece la trazabilidad.
- Facilita reconstruir el saldo.
- Reduce cambios silenciosos.

**Desventajas**
- El historial puede incluir movimientos correctivos.
- Se debe definir el tipo y motivo del ajuste.

### Alternativa C: reversión controlada

El movimiento original permanece y se genera una operación inversa vinculada.

**Ventajas**
- Conserva el registro original.
- Permite identificar la operación corregida.

**Desventajas**
- Requiere reglas adicionales.
- Los traslados necesitan reversión coordinada en origen y destino.
- Puede ser complejo revertir operaciones que ya afectaron otros procesos.

### Decisión propuesta para evaluar

No permitir editar ni eliminar movimientos confirmados. Permitir correcciones mediante movimientos de ajuste o reversión controlada.

### Justificación propuesta

La inmutabilidad es coherente con la obligación de reconstruir el saldo a partir de la historia de movimientos. Mantener los registros originales facilita identificar qué ocurrió y cuándo. Para una primera versión, un movimiento de ajuste puede ser más sencillo que una reversión completamente automatizada.

### Consecuencias

- Los movimientos confirmados son inmutables.
- Las correcciones generan nuevos registros.
- Los ajustes deben incluir motivo y referencia cuando corresponda.
- Un traslado debe tratarse como una operación coordinada de salida y entrada.
- Se debe impedir que una corrección genere existencias negativas.

---

## 8. AS-006. Identificación de productos

### Pregunta

¿Qué atributos mínimos tiene un producto y cómo se identifica de forma única?

### Atributos candidatos

- `id`: identificador interno.
- `sku`: código único del producto.
- `nombre`: nombre visible.
- `descripcion`: información adicional.
- `estado`: activo o descontinuado.
- `unidad_medida`: unidad, kilogramo, litro u otra, si se requiere.

### Alternativa A: solo ID interno

**Ventajas**
- Sencillo para las relaciones internas.
- Generado automáticamente.

**Desventajas**
- No necesariamente es cómodo para el usuario.
- Puede requerir un código comercial adicional.

### Alternativa B: SKU único

**Ventajas**
- Fácil de buscar y comunicar.
- Permite validar duplicados.

**Desventajas**
- Se debe definir cómo se genera.
- Se debe controlar su modificación.

### Alternativa C: ID interno más SKU único

**Ventajas**
- Separa la identificación técnica de la comercial.
- Permite buscar por SKU y relacionar por ID.

**Desventajas**
- Requiere mantener ambas identificaciones coherentes.

### Decisión propuesta para evaluar

Utilizar un ID interno generado por el sistema y un SKU único obligatorio para la identificación operativa.

### Justificación propuesta

El ID interno facilita las relaciones entre entidades, mientras que el SKU permite que el usuario identifique y busque el producto de forma clara. El nombre no debe utilizarse como identificador único porque puede repetirse o cambiar.

### Consecuencias

Modelo mínimo propuesto:

- `id`.
- `sku`.
- `nombre`.
- `descripcion`.
- `estado`.

El estado debe permitir distinguir productos activos y descontinuados. Un producto descontinuado no podrá recibir nuevas entradas, pero sí podrá registrar salidas conforme al enunciado.

---

## 9. AS-007. Cantidades

### Pregunta

¿Se manejan cantidades enteras o decimales?

### Alternativa A: cantidades enteras

**Ventajas**
- Validación sencilla.
- Menor riesgo de errores de precisión.
- Adecuado para productos manejados por unidades.

**Desventajas**
- No permite cantidades fraccionadas.

### Alternativa B: cantidades decimales

**Ventajas**
- Permite manejar peso, volumen o longitud.
- Mayor flexibilidad.

**Desventajas**
- Requiere definir precisión y redondeo.
- Puede complicar las validaciones y operaciones.

### Alternativa C: cantidad según unidad de medida

Cada producto define su unidad y sus reglas de precisión.

**Ventajas**
- Mayor flexibilidad.
- Permite validar de acuerdo con el tipo de producto.

**Desventajas**
- Aumenta la complejidad del modelo.
- Requiere reglas de conversión si se agregan diferentes unidades.

### Decisión propuesta para evaluar

Manejar cantidades enteras positivas en la primera versión.

### Justificación propuesta

El alcance de la prueba se concentra en demostrar el inventario multibodega, los movimientos y los despachos. Las cantidades enteras reducen la complejidad de validación y evitan introducir reglas de unidades de medida que no están especificadas.

### Consecuencias

- Las cantidades deben ser enteros mayores que cero.
- Las existencias no pueden ser negativas.
- Los valores decimales se rechazan.
- El manejo de peso, volumen, longitud y conversiones queda fuera del alcance inicial.

---

## 10. AS-008. Usuarios y permisos

### Pregunta

¿Habrá un usuario general o permisos diferenciados por bodega?

### Alternativa A: usuario general

Todos los usuarios tienen las mismas capacidades.

**Ventajas**
- Menor complejidad.
- Permite concentrarse en las reglas de inventario.
- No requiere implementar autenticación completa.

**Desventajas**
- No representa responsabilidades diferenciadas.
- Un usuario podría operar todas las bodegas.

### Alternativa B: roles generales

Se diferencian roles como administrador, operador, consulta y despacho.

**Ventajas**
- Separa responsabilidades.
- Permite restringir operaciones.

**Desventajas**
- Requiere diseñar y probar permisos.
- Puede aumentar el alcance.

### Alternativa C: permisos por bodega

Cada usuario opera una o varias bodegas.

**Ventajas**
- Representa una organización distribuida.
- Permite limitar las operaciones por ubicación.

**Desventajas**
- Requiere asociar usuarios y bodegas.
- Los traslados necesitan permisos especiales.
- Puede ser excesivo para la primera versión.

### Decisión propuesta para evaluar

Utilizar un usuario de demostración o acceso general para la primera versión y dejar la autenticación avanzada y los permisos detallados como alcance futuro.

### Justificación propuesta

La prueba exige persistencia, interfaz, reglas de negocio y una consulta de resumen, pero establece que la autenticación avanzada queda fuera del alcance general. Concentrar la primera versión en el inventario permite reducir la complejidad y dedicar más esfuerzo a la integridad de los movimientos.

### Consecuencias

- No se implementará un sistema completo de usuarios y contraseñas en la primera versión.
- El sistema podrá utilizar un contexto de usuario de demostración si es necesario registrar quién ejecuta una operación.
- Los permisos por bodega quedan documentados como mejora futura.
- No se debe afirmar que existe seguridad avanzada si no fue implementada.

---

## 11. Reglas de negocio derivadas

A partir de las decisiones propuestas, se pueden formular las siguientes reglas:

1. Un producto debe tener un SKU único.
2. Un producto descontinuado no permite nuevas entradas.
3. Un producto descontinuado sí permite salidas, según las demás validaciones.
4. Las cantidades deben ser enteros positivos.
5. Una salida no puede superar la existencia disponible de la bodega.
6. Un traslado debe descontar del origen y sumar al destino.
7. Un traslado no puede dejar la bodega de origen con existencia negativa.
8. Los movimientos confirmados no se editan ni eliminan.
9. Las correcciones se registran mediante movimientos adicionales.
10. La cantidad despachada de un pedido no puede superar la cantidad solicitada.
11. La suma de las asignaciones de bodegas debe coincidir con la cantidad despachada.
12. Un pedido puede tener varios despachos.
13. La consulta debe comparar la existencia de cada producto y bodega con su mínimo.
14. El saldo debe poder reconstruirse mediante la historia de movimientos.

---

## 12. Dependencias entre decisiones

Las asunciones se relacionan entre sí:

- El momento de descuento afecta la disponibilidad y los estados del pedido.
- La asignación de bodegas determina de dónde salen las unidades.
- Los pedidos parciales requieren controlar cantidades pendientes.
- La inmutabilidad de movimientos protege la reconstrucción del saldo.
- El mínimo por bodega afecta la estructura de la existencia y la consulta de alertas.
- La decisión sobre cantidades afecta las validaciones de entradas, salidas y traslados.
- Los permisos por bodega afectarían quién puede realizar movimientos y confirmar despachos.

Por ello, las decisiones deben revisarse como un conjunto y no únicamente de manera aislada.

---

## 13. Alcance propuesto para la primera versión

### Incluido

- Gestión básica de productos.
- Gestión de tres bodegas.
- Registro de existencias por bodega.
- Registro de entradas, salidas y traslados.
- Validación de existencias no negativas.
- Restricción de entradas para productos descontinuados.
- Creación y consulta de pedidos.
- Asignación manual de bodegas.
- Despachos parciales.
- Consulta de existencias por producto y bodega.
- Alertas de inventario por debajo del mínimo.
- Historial de movimientos.

### Fuera de alcance

- Autenticación avanzada.
- Permisos detallados por bodega.
- Algoritmos logísticos de optimización.
- Cálculo de rutas y costos de transporte.
- Reservas avanzadas con vencimiento.
- Lotes, vencimientos y números de serie.
- Conversión entre unidades de medida.
- Integraciones externas.
- Despliegue productivo.
- Pagos reales.

---

## 14. Matriz de resumen para la defensa

| Asunción | Alternativa propuesta | Motivo principal |
|---|---|---|
| Mínimo | Por producto y bodega | Alertas específicas por ubicación |
| Descuento | Al confirmar despacho | Separar pedido de salida física |
| Asignación | Manual | Reducir complejidad logística |
| Parciales | Permitidos | Mantener cantidades pendientes |
| Edición | Movimientos inmutables | Proteger trazabilidad |
| Producto | ID interno + SKU único | Separar identificación técnica y comercial |
| Cantidades | Enteras positivas | Simplificar validaciones |
| Usuarios | Acceso general de demostración | Concentrarse en el alcance principal |

Estas propuestas no son las únicas soluciones posibles. Se escogieron como una base coherente para una primera versión de alcance limitado.

---

## 15. Preguntas que podrían realizarte en la defensa

### ¿Por qué no automatizaste la asignación de bodegas?

Porque el enunciado exige que el pedido pueda despacharse desde varias bodegas, pero no exige un algoritmo logístico. La asignación manual permite demostrar la regla principal sin incorporar criterios no definidos como distancia, costos o rutas.

### ¿Por qué no descontaste al crear el pedido?

Porque se decidió separar la solicitud del movimiento físico de salida. El descuento se realiza al confirmar el despacho y se vuelve a validar la disponibilidad en ese momento.

### ¿Cómo evitas que se pierda la historia?

Los movimientos confirmados no se editan ni eliminan. Las correcciones se registran como movimientos adicionales, lo que permite conservar el registro original.

### ¿Qué ocurre si un pedido no se puede completar?

Se conserva la cantidad pendiente. Si se permiten despachos parciales, el pedido puede pasar por un estado parcialmente despachado hasta completar la cantidad solicitada.

### ¿Por qué manejas cantidades enteras?

Porque el enunciado no exige unidades fraccionarias y la primera versión busca concentrarse en las reglas de inventario multibodega. El manejo de decimales y unidades de medida se deja como una posible ampliación.

### ¿Por qué no implementaste permisos por bodega?

Porque la autenticación avanzada queda fuera del alcance general de la prueba y la prioridad es demostrar la persistencia, los movimientos, los despachos y la consulta obligatoria.

---

## 16. Conclusión

Las asunciones permiten convertir un enunciado incompleto en un comportamiento concreto del sistema. Las decisiones propuestas buscan equilibrar integridad, trazabilidad, facilidad de implementación y capacidad de defensa.

La principal prioridad es que el sistema cumpla las reglas obligatorias y que cada decisión pueda explicarse. Si una funcionalidad no se implementa, debe declararse como parte del alcance futuro o como una limitación conocida.
