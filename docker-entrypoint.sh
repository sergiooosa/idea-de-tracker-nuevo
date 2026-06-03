#!/bin/sh
# Entrypoint del dashboard: aplica migraciones determinísticas ANTES de levantar
# el server Next. Si la migración falla (y MIGRATIONS_FAILFAST != false) el
# contenedor no arranca y el deploy de Coolify queda marcado como fallido,
# dejando la versión anterior en servicio. Ver scripts/migrate.mjs y AUT-576.
set -e

echo "[entrypoint] aplicando migraciones de BD..."
node /app/scripts/migrate.mjs

echo "[entrypoint] iniciando servidor Next..."
exec node server.js
