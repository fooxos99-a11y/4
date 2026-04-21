-- جدول الرسائل الجاهزة للواتساب لجميع الإداريين
CREATE TABLE IF NOT EXISTS whatsapp_ready_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- صلاحية الإداريين للإضافة والحذف
CREATE POLICY "Admins can manage ready messages" ON whatsapp_ready_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
