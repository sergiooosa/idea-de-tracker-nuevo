ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS subtipo TEXT DEFAULT 'estandar';
ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS nombre_proyecto TEXT;
ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS pct_division NUMERIC(10,4) DEFAULT 100;
ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'transferencia';
ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS socios_split JSONB DEFAULT '[]';
ALTER TABLE comisiones_config ADD COLUMN IF NOT EXISTS notas TEXT;
