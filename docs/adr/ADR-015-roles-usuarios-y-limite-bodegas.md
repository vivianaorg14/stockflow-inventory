# ADR-015 — Modelo de roles (supervisor mayor y menor), autenticación JWT, límite de 3 bodegas y balanceo sugerido

**Estado:** Aceptado  
**Fecha:** 2026-09-19  
**Decisores:** Viviana Ortiz Gáfaro  
**Sustituye a / relacionado con:** **Sustituye a [ADR-010](ADR-010-sin-usuarios-ni-permisos.md)** (que definía el sistema sin autenticación en su versión base) y **extiende [ADR-006](ADR-006-asignacion-manual-de-bodegas.md)** (asignación manual de bodegas en despachos).

---

## Contexto y problema

El enunciado original del Sistema C describe una distribuidora con 3 bodegas físicas. En la primera versión funcional (v1), se priorizó el núcleo contable e inmutable de existencias sin incorporar autenticación ni usuarios ([ADR-010](ADR-010-sin-usuarios-ni-permisos.md)), y se permitía crear bodegas sin un tope en base de datos.

Para evolucionar el sistema hacia un escenario operativo corporativo realista (extensión de diseño), se identificaron cuatro necesidades:
1. **Control de acceso y responsabilidad territorial**: un supervisor local solo debe tener visibilidad y capacidad operativa sobre su propia bodega, evitando alteraciones cruzadas o despachos indebidos en inventarios ajenos.
2. **Coordinación centralizada**: debe existir un rol de supervisión global capaz de recibir pedidos de clientes, solicitar reportes de auditoría y despachar pedidos desde cualquiera de las bodegas.
3. **Límite físico estricto**: la empresa opera exactamente con 3 bodegas según su capacidad instalada; el software debe rechazar cualquier intento de crear bodegas adicionales.
4. **Asistencia para balanceo de inventario**: en pedidos de gran volumen, el supervisor mayor necesita saber cómo repartir las cantidades entre bodegas sin dejar a ninguna en cero ni vulnerar sus stocks mínimos de seguridad.

---

## Factores de decisión

- **Simplicidad y cero sobre-ingeniería**: implementar una autenticación ligera, estándar y segura basada en JSON Web Tokens (JWT) sin añadir frameworks pesados como Passport, Keycloak u OAuth2.
- **Portabilidad y resiliencia de dependencias**: generar y validar tokens JWT (RFC 7519) con algoritmo HMAC-SHA256 utilizando exclusivamente el módulo nativo `crypto` de Node.js, evitando dependencias externas que puedan generar fallos de instalación o incompatibilidades de versión.
- **Invariante de gobierno humano**: el sistema debe asistir mediante balanceo *sugerido*, pero **nunca** despachar automáticamente. La decisión final de confirmación sigue perteneciendo al usuario ([ADR-006](ADR-006-asignacion-manual-de-bodegas.md)).
- **Integridad de las reglas del enunciado**: las reglas de no existencias negativas (R1), despacho multibodega (R2), inmutabilidad de movimientos (R3) y bloqueo a entradas de descontinuados (R4) no deben verse alteradas.

---

## Alternativas consideradas

1. **Continuar sin autenticación (ADR-010)**: mantener el sistema abierto.
   - *Descartada*: no satisface el requerimiento de restringir la operación de un supervisor a su bodega ni modela la jerarquía corporativa solicitada.
2. **OAuth2 / OIDC con servidor de identidad externo (e.g., Auth0 / Keycloak)**:
   - *Descartada*: añade una enorme complejidad de despliegue y dependencias externas que imposibilitarían la evaluación local inmediata en un entorno académico o de prueba técnica.
3. **Roles jerárquicos (`supervisor_mayor` / `supervisor_menor`) con JWT nativo y validación contextual de bodega**:
   - Exactamente 1 `supervisor_mayor` (sin atadura a bodega).
   - Exactamente 1 `supervisor_menor` por cada una de las 3 bodegas (3 en total, cada uno con una `bodega_id` fija y obligatoria).
   - Límite de bodegas validado a nivel de controlador (`count >= 3` → HTTP 400).
   - Endpoint analítico de solo lectura `POST /api/pedidos/:id/sugerir-reparto`.

---

## Decisión

Se adopta la **Alternativa 3**:

1. **Modelo `Usuario`**:
   - Campos: `id`, `nombre`, `username` (único), `password_hash` (hasheado con `crypto.scryptSync`), `rol` (`supervisor_mayor` | `supervisor_menor`), `bodega_id` (FK a `Bodega`, nullable).
   - Validaciones a nivel de modelo:
     - `supervisor_mayor` exige `bodega_id = null`. Se restringe mediante hook a exactamente 1 instancia en el sistema.
     - `supervisor_menor` exige `bodega_id` obligatorio. Se restringe a un único supervisor menor por bodega.
2. **Autenticación JWT nativa**:
   - `POST /api/auth/login`: valida credenciales con `crypto.timingSafeEqual` y retorna un JWT (HS256) con expiración.
   - `GET /api/auth/perfil`: expone la identidad y bodega del usuario activo.
   - Middleware `autenticar`: verifica el encabezado `Authorization: Bearer <token>`.
3. **Matriz de Autorización por Rol**:
   - `supervisor_mayor`:
     - Consulta de existencias de todas las bodegas (`GET /api/inventario/existencias`).
     - Consulta de reportes de auditoría R3 (`GET /api/inventario/auditoria`).
     - Creación de pedidos (`POST /api/pedidos`).
     - Despacho multibodega sin restricción de origen (`POST /api/pedidos/:id/despachar`).
     - Consulta de sugerencia de balanceo (`POST /api/pedidos/:id/sugerir-reparto`).
     - Cancelación de pedidos (`POST /api/pedidos/:id/cancelar`).
   - `supervisor_menor`:
     - Consulta de existencias restringida estrictamente a su bodega (`GET /api/inventario/existencias` filtrado por su `bodega_id`).
     - Prohibido consultar auditoría general (HTTP 403).
     - Prohibido crear pedidos (HTTP 403).
     - Despachos y movimientos permitidos **únicamente** si involucran su propia bodega asignada. Cualquier intento de mover o despachar stock de otra bodega responde con **HTTP 403 Forbidden**.
4. **Límite de 3 Bodegas**:
   - `POST /api/bodegas` verifica `Bodega.count() >= 3`. Si se intenta crear una cuarta, responde con HTTP 400: *"El sistema solo admite 3 bodegas según el alcance definido"*.
5. **Criterio de Balanceo Sugerido (`POST /api/pedidos/:id/sugerir-reparto`)**:
   - **Algoritmo preventivo**:
     1. Para cada ítem pendiente, calcula en cada bodega el *excedente seguro*: `excedente = max(0, cantidad_actual - minimo)`.
     2. Ordena las bodegas de mayor a menor excedente y asigna unidades hasta agotar el excedente seguro sin vulnerar el mínimo de ninguna bodega.
     3. Si el excedente no alcanza a cubrir la totalidad de la demanda, toma del remanente (`cantidad_actual > 0`), emitiendo advertencias explícitas sobre las bodegas que caerían por debajo de su mínimo.
     4. Si el stock global no es suficiente, emite una advertencia de desabastecimiento total.
   - **Garantía de inmutabilidad**: el endpoint es de solo lectura; calcula y devuelve la estructura JSON, pero **no modifica** ninguna tabla ni registra movimientos.

---

## Consecuencias

### Positivas
- **Trazabilidad de responsabilidades**: cada bodega tiene un responsable identificable que no puede interferir en los inventarios de sus pares.
- **Portabilidad absoluta**: implementado con herramientas nativas de Node.js (`crypto`), sin dependencias adicionales en `package.json`.
- **Soporte a la toma de decisiones**: el balanceo sugerido optimiza la distribución logística sin quitarle el control al supervisor mayor.
- **Cumplimiento estricto del alcance**: se previene el crecimiento descontrolado de bodegas más allá de las 3 contempladas en el problema.

### Negativas / Compromisos
- Las solicitudes autenticadas requieren gestionar el token en el cliente (`Authorization: Bearer <jwt>`).
- En la interfaz estática, se requiere seleccionar o ingresar el usuario para operar bajo las restricciones de su rol.
