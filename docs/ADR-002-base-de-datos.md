# ADR-002 — Elección de motor de base de datos

**Estado:** Aceptado  
**Fecha:** 2026-09-18  
**Autora:** Viviana Ortiz

---

## Contexto

El sistema requiere persistir entidades relacionadas (Producto, Bodega, Existencia, Movimiento, Pedido) y garantizar integridad referencial. El evaluador debe poder ejecutar el sistema desde cero en cualquier máquina.

Las opciones consideradas son bases de datos relacionales, ya que el modelo de datos tiene relaciones claras y la consulta obligatoria requiere joins.

---

## Decisión

Se elige **SQLite** como motor de base de datos para la primera versión de StockFlow.

---

## Alternativas consideradas

### Opción A — PostgreSQL
- **Ventaja:** base de datos de producción robusta, soporte completo de SQL estándar, buenas herramientas de administración.
- **Desventaja:** requiere instalación y configuración del servidor. El evaluador necesitaría tener PostgreSQL corriendo localmente o usar Docker. Agrega fricción al proceso de evaluación "desde cero".
- **Razón de descarte:** la complejidad de configuración no aporta valor al alcance de la prueba. El enunciado no requiere características específicas de PostgreSQL.

### Opción B — MySQL / MariaDB
- **Ventaja:** muy extendido, compatible con muchos hostings.
- **Desventaja:** misma problemática que PostgreSQL: requiere servicio corriendo. Configuración de usuario y contraseña necesaria.
- **Razón de descarte:** mismas razones que PostgreSQL.

### Opción C — MongoDB (NoSQL)
- **Ventaja:** flexible para estructuras variables.
- **Desventaja:** el modelo de datos de inventario tiene relaciones fuertes (producto ↔ bodega ↔ existencia) que se representan mejor en tablas relacionales. Las transacciones de traslado (descontar origen, sumar destino atómicamente) son más directas en SQL.
- **Razón de descarte:** no se ajusta al modelo relacional del dominio.

### Opción D — SQLite ✅ (elegida)
- **Ventaja:** no requiere servidor ni configuración. La base de datos es un único archivo `.sqlite` incluido en el proyecto.
- **Ventaja:** compatible con Sequelize, el ORM elegido para el proyecto.
- **Ventaja:** ejecutar el proyecto desde cero es `npm install && npm run seed && npm start`. Sin pasos adicionales.
- **Desventaja:** no es adecuado para producción con concurrencia alta.
- **Razón de elección:** el criterio principal es que el evaluador pueda ejecutar el sistema desde cero sin instalar nada más allá de Node.js.

---

## Consecuencias

- La base de datos se crea como archivo `stockflow.sqlite` en la raíz del proyecto.
- El archivo se agrega a `.gitignore` para no subir datos de prueba al repositorio.
- El script `npm run seed` crea las tablas y carga datos de ejemplo cada vez que se ejecuta.
- Si se quisiera migrar a PostgreSQL en el futuro, solo se necesita cambiar la configuración de Sequelize (el resto del código no cambia).

---

## Notas para la defensa oral

> **Pregunta probable:** ¿SQLite es una base de datos seria? ¿Por qué no usaste PostgreSQL?

**Respuesta preparada:** SQLite es una base de datos relacional completa, usada en millones de sistemas (incluyendo iOS, Android y Firefox). La razón de elegirla no es que sea "más fácil", sino que elimina una barrera de instalación para quien vaya a evaluar el sistema. Si mañana necesito escalar o ir a producción, cambiar a PostgreSQL con Sequelize requiere modificar solo la configuración de conexión, no el código de modelos ni controladores.
