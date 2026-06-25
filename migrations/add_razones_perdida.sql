-- Agrega columnas para el widget Razones de Pérdida (AUT-1062/AUT-1064)
ALTER TABLE public.cuentas
  ADD COLUMN IF NOT EXISTS razones_perdida_config jsonb,
  ADD COLUMN IF NOT EXISTS razones_perdida_data   jsonb;
