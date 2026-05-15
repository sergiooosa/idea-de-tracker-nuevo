-- Índice parcial para optimizar la query de leads en espera en el dashboard cliente
-- Elimina full table scan sobre registros_de_llamada (54,290 filas en producción)
-- Ejecutar: psql $DATABASE_URL -f migrations/add_index_registros_pdte_espera.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registros_id_cuenta_pdte_espera
  ON registros_de_llamada (id_cuenta, fecha_evento)
  WHERE estado = 'pdte' AND fecha_primera_llamada IS NULL;
