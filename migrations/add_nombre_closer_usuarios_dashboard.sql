-- Agregar campo nombre_closer a usuarios_dashboard
-- Permite mapear email de asesor → nombre que aparece en resumenes_diarios_agendas.closer
-- (Fathom a veces guarda nombre completo en lugar de email)
ALTER TABLE public.usuarios_dashboard ADD COLUMN IF NOT EXISTS nombre_closer text;
