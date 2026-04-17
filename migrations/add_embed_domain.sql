-- Agrega columna embed_domain a cuentas para dominios de embedding personalizados
-- (clientes GHL white-label y CRMs externos)
-- Requiere ejecutar como usuario postgres en mainbd.automatizacionesia.com

ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS embed_domain TEXT DEFAULT NULL;

COMMENT ON COLUMN cuentas.embed_domain IS
  'Dominio externo desde el que se permite embeber el dashboard como iframe. '
  'Ej: https://app.ikigai.com.ec — se usa en Content-Security-Policy frame-ancestors. '
  'NULL = solo dominios GHL estándar.';

-- Configurar clientes actuales con dominio custom
UPDATE cuentas SET embed_domain = 'https://app.ikigai.com.ec' WHERE id_cuenta = 4;
UPDATE cuentas SET embed_domain = 'https://crmpatrimonioparatufamilia.netlify.app' WHERE id_cuenta = 32;
