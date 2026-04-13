ALTER TABLE whatsapp_replies
  ADD COLUMN IF NOT EXISTS reply_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS media_base64 TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_replies_reply_type ON whatsapp_replies(reply_type);