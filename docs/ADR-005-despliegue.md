# ADR-005-despliegue — Despliegue de StockFlow en Render

> **Nota:** Este documento es una referencia directa a [`adr/ADR-016-despliegue-en-render.md`](adr/ADR-016-despliegue-en-render.md), creado para mantener consistencia con los requerimientos de entrega.

**Estado:** Aceptado  
**Fecha:** 2026-09-20  
**Decisores:** Viviana Ortiz Gáfaro  
**URL de producción:** https://stockflow-inventory-ufps.onrender.com/

---

## Resumen de la decisión

Se implementó el despliegue del sistema completo (backend Express + frontend estático) como un **Web Service único en Render** en su plan gratuito (*Free Tier*).

1. **Servicio unificado:** Express sirve la API REST (`/api`) y los archivos estáticos (`public/`) bajo el mismo dominio y puerto (`Same-Origin`), eliminando la necesidad de gestionar CORS o múltiples URLs.
2. **Compatibilidad técnica:** A diferencia de plataformas serverless como Vercel (donde el módulo nativo C++ `sqlite3` falla al compilar), Render ejecuta un entorno Linux nativo donde Node.js y SQLite operan con total normalidad.
3. **Comandos de despliegue:**
   - *Build Command:* `npm install && npm run seed`
   - *Start Command:* `npm start`
4. **Persistencia y limitación conocida:** En el Free Tier de Render, el sistema de archivos es efímero entre redeploys (cada nuevo despliegue desde git reinicia el contenedor y vuelve a ejecutar el seed demo). Esta condición se documenta formalmente como una limitación conocida del alcance de demostración académica.

Para consultar el análisis detallado de alternativas (Vercel vs Render vs Railway) y consecuencias arquitectónicas, consultar el documento oficial:
👉 [`docs/adr/ADR-016-despliegue-en-render.md`](adr/ADR-016-despliegue-en-render.md)
