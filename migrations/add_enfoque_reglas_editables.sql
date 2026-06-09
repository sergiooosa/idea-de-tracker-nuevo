-- Fase 4c: reglas de avance editables por sesión
ALTER TABLE sesiones_enfoque
  ADD COLUMN IF NOT EXISTS lock_expiracion_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS poll_intervalo_seg integer NOT NULL DEFAULT 4;
