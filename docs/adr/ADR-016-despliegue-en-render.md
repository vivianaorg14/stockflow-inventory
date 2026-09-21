# ADR-016 — Despliegue de StockFlow en Render

**Estado:** Aceptado  
**Fecha:** 2026-09-20  
**Decisores:** Viviana Ortiz Gáfaro  
**Relacionado con:** [`ADR-002`](ADR-002-base-de-datos.md) (SQLite como motor de base de datos), [`ADR-013`](ADR-013-frontend-estatico.md) (Frontend estático servido por Express), [`../../ASSUMPTIONS.md`](../../ASSUMPTIONS.md) (AS-012)

---

## Contexto y problema

El sistema StockFlow requiere ser desplegado en la nube con acceso público vía HTTPS tanto para su API REST como para su interfaz web interactiva.
El stack técnico está compuesto por Node.js, Express y una base de datos local SQLite (`stockflow.sqlite`) gestionada a través de Sequelize.

Al evaluar plataformas de hosting gratuitas en la nube (PaaS / Serverless), se presentaron incompatibilidades técnicas con proveedores de funciones serverless (específicamente **Vercel**), donde el módulo nativo C++ `sqlite3` no puede ser cargado en las Lambdas y el sistema de archivos es estrictamente de solo lectura (`EROFS`).

Se requiere seleccionar una plataforma que permita alojar la aplicación con costo cero, soporte nativo para Node.js y SQLite, y mínima fricción operativa.

---

## Factores de decisión

- **Compatibilidad con SQLite:** Capacidad de compilar y ejecutar el módulo nativo `sqlite3` en Linux.
- **Arquitectura unificada:** Posibilidad de servir la API (`/api/...`) y los activos estáticos del frontend (`public/`) bajo el mismo dominio y puerto (evitando problemas de CORS y configuración de DNS múltiple).
- **Costo:** Nivel gratuito (*Free Tier*) sin requerir tarjetas de crédito ni infraestructura paga.
- **Automatización del despliegue:** Integración continua directa con el repositorio de GitHub (`main`).

---

## Alternativas consideradas

### 1. Vercel (Serverless Functions)
- **Ventajas:** Despliegue veloz, excelente red CDN para frontend.
- **Desventajas:** 
  - Las funciones serverless de Vercel excluyen los módulos binarios nativos C++ (`sqlite3`), arrojando el error crítico `Error: Please install sqlite3 package manually at ConnectionManager.getConnection`.
  - El sistema de archivos es efímero y de solo lectura (`EROFS`), lo que impide persistir transacciones en archivos SQLite locales.
  - Obliga a migrar el dialecto de base de datos a un servicio externo gestionado (PostgreSQL en Neon/Supabase), alterando el stack tecnológico acordado.

### 2. Render (Web Service continuo con Node.js) — *Elegida*
- **Ventajas:**
  - Ejecuta un contenedor Linux real con un proceso Node.js continuo (`node index.js`).
  - Compila e instala `sqlite3` de forma nativa sin fallos de dependencias.
  - Aloja backend y frontend juntos como un único servicio unificado (*Same-Origin*).
  - Permite ejecutar `npm run seed` en el *Build Command* para generar automáticamente los datos iniciales.
  - Proporciona HTTPS automático y dominio público (`https://stockflow-inventory-ufps.onrender.com/`).
- **Desventajas:**
  - En el plan gratuito (*Free Tier*), el sistema de archivos del contenedor es efímero entre *redeploys* (nuevos despliegues o reinicios destruyen el disco local y vuelven a ejecutar el seed inicial).
  - El servicio entra en suspensión tras 15 minutos de inactividad (*cold start* de ~30-50 segundos en la primera petición tras reposo).

### 3. Railway / Fly.io
- **Ventajas:** Soporte completo de contenedores y posibilidad de volúmenes persistentes.
- **Desventajas:** Planes de prueba limitados por tiempo o créditos que expiran rápidamente.

---

## Decisión

Se elige **Render** como plataforma de despliegue mediante un **Web Service unificado** en su plan gratuito.

### Parámetros de configuración en Render
- **Tipo de servicio:** Web Service.
- **Runtime:** `Node`.
- **Build Command:** `npm install && npm run seed`
- **Start Command:** `npm start`
- **URL pública:** `https://stockflow-inventory-ufps.onrender.com/`

---

## Consecuencias y gestión de la persistencia efímera

### Limitación conocida real (No teórica)
En el plan gratuito de Render, el disco del contenedor no es persistente entre despliegues.
- **En operación continua:** Mientras el servicio esté activo o en reposo temporal, las operaciones de inventario (entradas, salidas, pedidos) se mantienen en el archivo SQLite de la instancia.
- **En cada redeploy (nuevo commit en git):** El contenedor se reconstruye y vuelve a ejecutar `npm run seed`, restableciendo el catálogo a su estado base de demostración (5 productos, 3 bodegas, existencias demo y 4 usuarios).

### Justificación de alcance
Esta limitación se asume como **aceptable y controlada** para el alcance del proyecto académico, garantizando que el evaluador siempre encuentre un entorno funcional, poblado con datos limpios y listo para probar sin costo alguno. Para un entorno de producción corporativo, el paso siguiente natural es contratar un *Persistent Disk* de Render o migrar el dialecto de Sequelize a PostgreSQL gestionado.
