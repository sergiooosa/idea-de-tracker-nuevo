-- Fase 3a: lock por lead en modo enfoque
-- Tabla separada para no tocar registros_de_llamada

CREATE TABLE IF NOT EXISTS enfoque_lock (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_sesion TEXT NOT NULL REFERENCES sesiones_enfoque(id) ON DELETE CASCADE,
  id_cuenta INTEGER NOT NULL REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  id_registro INTEGER NOT NULL REFERENCES registros_de_llamada(id_registro),
  en_progreso_por TEXT NOT NULL,
  lock_ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_enfoque_lock_sesion_registro
  ON enfoque_lock (id_sesion, id_registro);

CREATE INDEX IF NOT EXISTS idx_enfoque_lock_sesion_closer
  ON enfoque_lock (id_sesion, en_progreso_por);
