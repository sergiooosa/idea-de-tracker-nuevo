-- Backfill: agrega KPI "Reuniones canceladas" (meetingsCanceled) a 5 tenants
-- activos cuyo metricas_config guardado no lo incluye (AUT-806 / AUT-800).
-- Idempotente: no duplica si ya existe una entrada con fuente meetingsCanceled.

UPDATE cuentas
SET metricas_config = metricas_config || jsonb_build_array(
  jsonb_build_object(
    'id',          'base-reuniones-canceladas',
    'nombre',      'Reuniones canceladas',
    'descripcion', 'Citas canceladas antes de realizarse',
    'tipo',        'automatica',
    'paneles',     '["panel_ejecutivo"]'::jsonb,
    'orden',       (
      SELECT COALESCE(MAX((e->>'orden')::int), -1) + 1
      FROM jsonb_array_elements(cuentas.metricas_config) e
    ),
    'formato',     'numero',
    'color',       'red',
    'formula',     '{"tipo":"directo","fuente":"meetingsCanceled"}'::jsonb
  )
)
WHERE estado_cuenta = 'activo'
  AND jsonb_typeof(metricas_config) = 'array'
  AND jsonb_array_length(metricas_config) > 0
  AND (
    SELECT count(*)
    FROM jsonb_array_elements(metricas_config) e
    WHERE e->'formula'->>'fuente' = 'meetingsCanceled'
  ) = 0;
