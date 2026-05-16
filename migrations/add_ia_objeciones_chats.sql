-- AUT-193: Agregar columna ia_objeciones a chats_logs
-- Almacena las objeciones detectadas por la IA nocturna en conversaciones de chat.
-- Estructura: [{ "objecion": "texto", "categoria": "precio|tiempo|confianza|..." }]

ALTER TABLE chats_logs ADD COLUMN IF NOT EXISTS ia_objeciones jsonb;
