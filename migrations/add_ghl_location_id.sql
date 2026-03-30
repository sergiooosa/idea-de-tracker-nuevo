-- Agrega ghl_location_id a cuentas para construir links directos a contactos en GHL
-- Ejecutar: psql $DATABASE_URL -f migrations/add_ghl_location_id.sql

ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS ghl_location_id TEXT;

-- Luego de ejecutar, configurar el locationId de cada cuenta en el panel System
-- Ejemplo: UPDATE cuentas SET ghl_location_id = '26Syf1QF0jxwjYm5UVSa' WHERE subdominio = 'tracker-nicolas-tamayo';
