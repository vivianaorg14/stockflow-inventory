# CLAUDE.md

StockFlow — inventario multibodega (Sistema C de la prueba técnica del curso).
**Node.js + Express + Sequelize + SQLite**, API REST sin frontend.

Este archivo es **corto a propósito**. Toda la documentación vive en `docs/`.
Si vas a agregar acá "estado de la sesión", "pendientes" o "lo que se hizo": **no**.
Va en `docs/06-pendientes.md`, `docs/07-historial.md` y, para sesiones con IA, `BITACORA-IA.md`.

---

## Al empezar cualquier sesión (obligatorio)

1. **[docs/00-INDEX.md](docs/00-INDEX.md)** — resumen del sistema + mapa de la documentación.
2. **[docs/06-pendientes.md](docs/06-pendientes.md)** — qué está abierto.
3. Antes de escribir código, **[docs/04-convenciones.md](docs/04-convenciones.md)** — reglas
   de código y de documentación. No son opcionales.

Reglas globales de este PC, que aplican también acá:
`~/.claude/dev-rules.md` (desarrollo) · `~/.claude/docs-protocol.md` (documentación).

| Necesito… | Voy a |
|---|---|
| El enunciado literal (R1–R4, consulta obligatoria) | [docs/08-enunciado.md](docs/08-enunciado.md) |
| Stack, capas, dueño de cada invariante | [docs/01-arquitectura.md](docs/01-arquitectura.md) |
| Reglas, ciclo del pedido, tabla de endpoints | [docs/02-dominio.md](docs/02-dominio.md) |
| Una decisión con sus alternativas | [docs/adr/](docs/adr/README.md) |
| Un comando, los `curl` de demo, un gotcha | [docs/05-runbook.md](docs/05-runbook.md) |

## Comandos mínimos

```bash
npm install
npm run seed     # borra y recrea stockflow.sqlite con datos de demo
npm start        # http://localhost:3000/api/inventario/existencias
```

No hay tests ni lint todavía (`Q-01`, `Q-02` en pendientes).

## Reglas duras (violarlas rompe cosas)

- **Todas las rutas cuelgan de `/api`.** Documentar o probar sin el prefijo = 404.
- **`movimientos` es solo inserción.** Nunca `PUT`/`DELETE`, nunca `update()` sobre `Movimiento`.
- **Ninguna existencia negativa se persiste**; cantidades enteras > 0 en toda entrada.
- **Sequelize, nunca SQL crudo.** Varias tablas → una transacción.
- **La lógica de dominio tiene un dueño único** (tabla en `docs/01`). Nadie recalcula; todos llaman.
- **Antes de refactorizar: tests de caracterización.** Sin red, no se mueve nada.
- **Una decisión con alternativas es un ADR**, no un comentario ni un párrafo del README.
- **Commit chico**, Conventional Commits con scope (`feat(pedidos):`, `docs:`).
- `stockflow.sqlite` y secretos nunca se commitean.

## Cierre de cada cambio (obligatorio)

1. Estado que haya cambiado → `docs/01`–`05`.
2. Entrada en `docs/07-historial.md`: qué · por qué · cómo revertir.
3. `docs/06-pendientes.md`: cerrar lo hecho con evidencia, dar de alta lo que quedó abierto.
4. Sesión con IA → entrada en `BITACORA-IA.md` (qué pedí / propuso / acepté / rechacé).
