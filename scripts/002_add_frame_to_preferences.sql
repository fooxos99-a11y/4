-- إضافة عمود active_frame إلى جدول student_preferences
ALTER TABLE student_preferences ADD COLUMN IF NOT EXISTS active_frame TEXT;

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  active_frame TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);
