-- جدول لتخزين رسائل الواتساب المرسلة
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_mime_type TEXT,
  media_base64 TEXT,
  media_file_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
  message_id TEXT, -- WhatsApp message ID
  error_message TEXT,
  sent_by UUID REFERENCES users(id), -- المستخدم الذي أرسل الرسالة
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول لتخزين ردود العملاء
CREATE TABLE IF NOT EXISTS whatsapp_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_id TEXT UNIQUE, -- WhatsApp message ID
  timestamp BIGINT, -- Unix timestamp من WhatsApp
  is_read BOOLEAN DEFAULT FALSE,
  original_message_id UUID REFERENCES whatsapp_messages(id), -- ربط بالرسالة الأصلية
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_type ON whatsapp_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_replies_phone ON whatsapp_replies(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_replies_read ON whatsapp_replies(is_read);

-- Row Level Security
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_replies ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - السماح للإداريين فقط
CREATE POLICY "Admins can view all messages" ON whatsapp_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert messages" ON whatsapp_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all replies" ON whatsapp_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert replies" ON whatsapp_replies
  FOR INSERT
  WITH CHECK (true); -- للسماح للـ webhook بإضافة الردود

CREATE POLICY "Admins can update replies" ON whatsapp_replies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- دالة لتحديث حالة الرسالة
CREATE OR REPLACE FUNCTION update_message_status(
  p_message_id TEXT,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_messages
  SET status = p_status
  WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على إحصائيات الرسائل
CREATE OR REPLACE FUNCTION get_whatsapp_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sent', (SELECT COUNT(*) FROM whatsapp_messages),
    'pending', (SELECT COUNT(*) FROM whatsapp_messages WHERE status = 'pending'),
    'sent', (SELECT COUNT(*) FROM whatsapp_messages WHERE status = 'sent'),
    'delivered', (SELECT COUNT(*) FROM whatsapp_messages WHERE status = 'delivered'),
    'failed', (SELECT COUNT(*) FROM whatsapp_messages WHERE status = 'failed'),
    'total_replies', (SELECT COUNT(*) FROM whatsapp_replies),
    'unread_replies', (SELECT COUNT(*) FROM whatsapp_replies WHERE is_read = FALSE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
