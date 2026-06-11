-- AUT-856 — Modo Enfoque v2: migración ADITIVA a BD prod del tracker
-- mainbd.automatizacionesia.com / db postgres
-- Requiere usuario con permisos DDL (agente_readonly NO sirve).
--
-- Bloquea F2/F3/F4 del Plan Modo Enfoque v2 (AUT-850).
-- Todo es ADITIVO, NO destructivo e IDEMPOTENTE (ADD COLUMN IF NOT EXISTS /
-- CREATE TABLE/INDEX IF NOT EXISTS). No elimina ni altera columnas existentes.
--
-- Tablas base verificadas en prod (2026-06-11):
--   sesiones_enfoque, usuarios_dashboard, enfoque_lock, enfoque_resultado  ✓
--   enfoque_admin_audit: no existe (se crea aquí)
-- Tipos FK verificados en prod:
--   cuentas.id_cuenta = integer  ✓   registros_de_llamada.id_registro = integer  ✓

BEGIN;

-- ── sesiones_enfoque: parámetros de reintento / expiración ───────────
ALTER TABLE sesiones_enfoque
  ADD COLUMN IF NOT EXISTS max_intentos       INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_intervalo_min INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS retry_estados       JSONB   NOT NULL DEFAULT '["no_contesto","buzon"]'::jsonb,
  ADD COLUMN IF NOT EXISTS accion_agotado      TEXT    NOT NULL DEFAULT 'seguimiento',
  ADD COLUMN IF NOT EXISTS expiry_streak_max   INTEGER NOT NULL DEFAULT 5;

-- ── usuarios_dashboard: tipo de usuario (analista por defecto) ────────
ALTER TABLE usuarios_dashboard
  ADD COLUMN IF NOT EXISTS tipo_usuario TEXT NOT NULL DEFAULT 'analista';

-- ── enfoque_lock: metadatos de marcación / snapshot ──────────────────
ALTER TABLE enfoque_lock
  ADD COLUMN IF NOT EXISTS dial_ts            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_sid           TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_canonico  TEXT;

-- ── enfoque_resultado: numeración de intento + detección ─────────────
ALTER TABLE enfoque_resultado
  ADD COLUMN IF NOT EXISTS attempt_no    INTEGER,
  ADD COLUMN IF NOT EXISTS detectado_por TEXT;

-- Un único resultado por (sesion, registro, closer, intento) cuando hay intento.
CREATE UNIQUE INDEX IF NOT EXISTS uq_enfoque_resultado_attempt
  ON enfoque_resultado (id_sesion, id_registro, closer_mail, attempt_no)
  WHERE attempt_no IS NOT NULL;

-- ── enfoque_admin_audit: auditoría de acciones admin sobre Enfoque ────
CREATE TABLE IF NOT EXISTS enfoque_admin_audit (
  id           TEXT PRIMARY KEY,
  id_cuenta    INTEGER,
  id_sesion    TEXT,
  actor_email  TEXT,
  accion       TEXT,
  target_email TEXT,
  id_registro  INTEGER,
  detalle      JSONB,
  ts           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

-- Verificación post-aplicación:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='sesiones_enfoque'
--     AND column_name IN ('max_intentos','retry_intervalo_min','retry_estados','accion_agotado','expiry_streak_max');
-- SELECT to_regclass('public.enfoque_admin_audit');
-- SELECT indexname FROM pg_indexes WHERE indexname='uq_enfoque_resultado_attempt';
