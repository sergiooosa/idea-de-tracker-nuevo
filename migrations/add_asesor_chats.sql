ALTER TABLE chats_logs ADD COLUMN IF NOT EXISTS asesor_asignado TEXT;
UPDATE chats_logs
SET asesor_asignado = (
  SELECT m->>'name'
  FROM jsonb_array_elements(chat) AS m
  WHERE m->>'role' = 'agent'
  LIMIT 1
)
WHERE asesor_asignado IS NULL AND chat IS NOT NULL AND jsonb_array_length(chat) > 0;
