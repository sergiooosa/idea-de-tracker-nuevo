-- AUT-544 (Fase 1 Modo Enfoque) — tablas base que nunca se commitearon como
-- migración y causaron el incidente silencioso (rutas /api/enfoque/* rotas en
-- prod ~1 día). Se aplicaron a mano en AUT-575. Se añaden aquí para que
-- migrations/ refleje el schema completo de enfoque. Todo es ADITIVO.
-- add_enfoque_lock.sql depende de sesiones_enfoque(id) — este archivo ordena
-- alfabéticamente antes ("fase1" < "lock"), garantizando el orden de FK.

CREATE TABLE IF NOT EXISTS sesiones_enfoque (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_cuenta       INTEGER NOT NULL REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  modo            TEXT NOT NULL DEFAULT 'llamada',
  filtro_estado   JSONB,
  filtro_asesores JSONB,
  orden           TEXT NOT NULL DEFAULT 'mas_antiguo',
  activa          BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sesiones_enfoque_cuenta
  ON sesiones_enfoque (id_cuenta);

CREATE TABLE IF NOT EXISTS enfoque_resultado (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_sesion           TEXT NOT NULL REFERENCES sesiones_enfoque(id) ON DELETE CASCADE,
  id_cuenta           INTEGER NOT NULL REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  closer_mail         TEXT NOT NULL,
  id_registro         INTEGER NOT NULL REFERENCES registros_de_llamada(id_registro),
  resultado_canonico  TEXT NOT NULL,
  nota                TEXT,
  duracion_seg        INTEGER,
  ts                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enfoque_resultado_sesion
  ON enfoque_resultado (id_sesion);
CREATE INDEX IF NOT EXISTS idx_enfoque_resultado_cuenta
  ON enfoque_resultado (id_cuenta);
