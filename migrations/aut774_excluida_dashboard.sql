-- AUT-774: exclusión reversible de reuniones del dashboard de Videollamadas
ALTER TABLE resumenes_diarios_agendas
  ADD COLUMN IF NOT EXISTS excluida_dashboard BOOLEAN NOT NULL DEFAULT FALSE;
