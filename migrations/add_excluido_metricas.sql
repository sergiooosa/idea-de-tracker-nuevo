-- AUT-1630: Agregar columna excluido_metricas a registros_de_llamada
-- Permite marcar leads que no deben contar en las métricas del asesor
ALTER TABLE registros_de_llamada
  ADD COLUMN IF NOT EXISTS excluido_metricas BOOLEAN NOT NULL DEFAULT false;
