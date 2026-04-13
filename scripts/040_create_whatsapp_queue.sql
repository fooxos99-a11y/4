CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_mime_type TEXT,
  media_base64 TEXT,
  media_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created_at ON whatsapp_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_type ON whatsapp_queue(message_type);

ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view whatsapp queue" ON whatsapp_queue;
CREATE POLICY "Admins can view whatsapp queue" ON whatsapp_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert whatsapp queue" ON whatsapp_queue;
CREATE POLICY "Admins can insert whatsapp queue" ON whatsapp_queue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update whatsapp queue" ON whatsapp_queue;
CREATE POLICY "Admins can update whatsapp queue" ON whatsapp_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_queue;
  END IF;
END $$;