-- Migration: add_closer_merge_tables
-- Adds the closer_merge_suggestions table and closer_merge_rules JSONB column
-- to support the intelligent closer deduplication system.
-- Safe: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS — idempotent.

-- ── 1. Nueva tabla: closer_merge_suggestions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS closer_merge_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cuenta INTEGER NOT NULL REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
  candidatos JSONB NOT NULL,
  -- [{email?: string, nombre: string, conteo: number}] — lista de candidatos a unificar
  canonical_email TEXT,           -- email propuesto como canonical
  canonical_nombre TEXT NOT NULL, -- nombre propuesto como canonical
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'accepted' | 'rejected'
  resuelto_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_cuenta_status
  ON closer_merge_suggestions(id_cuenta, status);

-- ── 2. Nueva columna en cuentas: closer_merge_rules ───────────────────────────
ALTER TABLE cuentas
  ADD COLUMN IF NOT EXISTS closer_merge_rules JSONB DEFAULT '[]'::jsonb;
