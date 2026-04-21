ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS media_base64 TEXT,
  ADD COLUMN IF NOT EXISTS media_file_name TEXT;

ALTER TABLE whatsapp_queue
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS media_base64 TEXT,
  ADD COLUMN IF NOT EXISTS media_file_name TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_type ON whatsapp_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_type ON whatsapp_queue(message_type);