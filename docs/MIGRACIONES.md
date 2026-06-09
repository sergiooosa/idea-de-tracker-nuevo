# Migraciones de BD — flujo automático en deploy (AUT-576)

Desde AUT-576 el deploy del dashboard **aplica las migraciones automáticamente**
antes de levantar el server. Ya **no** hay que correr `psql -f migrations/*.sql`
a mano contra prod. Esto cierra el incidente silencioso de AUT-544/AUT-575
(tablas `sesiones_enfoque`/`enfoque_resultado` que quedaron sin crear ~1 día).

## Cómo añadir una migración

1. Cambia `src/lib/db/schema.ts` como siempre.
2. **Crea un archivo SQL idempotente en `migrations/`** con el cambio
   (usa `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.).
   - Solo cambios **aditivos**. Nunca `DROP`/`DELETE` sin aprobación de Juan.
   - Los archivos se aplican en **orden alfabético**. Si el orden importa
     (FK, dependencias), nombra el archivo para que ordene correctamente.
   - Para índices grandes usa `CREATE INDEX CONCURRENTLY IF NOT EXISTS`; el
     runner los ejecuta fuera de transacción automáticamente.
3. Abre PR. Al mergear a `main`, Coolify hace build + deploy y el runner aplica
   la migración nueva contra prod **sin paso manual**.

## Cómo funciona

- `docker-entrypoint.sh` corre `node scripts/migrate.mjs` y luego `node server.js`.
- `scripts/migrate.mjs` (usa `pg`, ya trazado en el output standalone de Next):
  - Lleva control en la tabla `_dashboard_migrations` → cada archivo se aplica
    **una sola vez**.
  - **Baseline en la primera ejecución:** si la tabla de tracking no existe,
    asume que prod ya tiene todas las migraciones actuales (se aplicaron a mano)
    y las registra **sin ejecutarlas**. A partir de ahí solo se aplican las nuevas.
  - **Fail-fast:** si una migración falla, el contenedor no arranca y el deploy
    de Coolify queda marcado como fallido → la versión anterior sigue sirviendo
    (no hay outage por una migración rota, y el fallo es ruidoso, no silencioso).

## Variables de entorno (Coolify)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `MIGRATIONS_DATABASE_URL` | recomendada | Rol con permisos **DDL** (CREATE/ALTER) para correr migraciones. Si no se define, usa `DATABASE_URL`. ⚠️ El usuario runtime del app puede ser de menor privilegio y no poder crear tablas. |
| `MIGRATIONS_FRESH=true` | no | Fuerza aplicar **todas** las migraciones (ignora el baseline). Solo para BD vacías de desarrollo. |
| `MIGRATIONS_FAILFAST=false` | no | Escape de emergencia: arranca el server aunque la migración falle. Usar solo para desbloquear un incidente. |

> ⚠️ **Requisito de la primera adopción:** `MIGRATIONS_DATABASE_URL` debe apuntar
> a un rol con permisos DDL en `mainbd.automatizacionesia.com`. Las migraciones
> manuales se corrían como `postgres` (superuser). Confirmar/crear ese rol con
> Juan antes del primer deploy con este cambio.
