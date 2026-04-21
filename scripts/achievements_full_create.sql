-- إنشاء جدول الإنجازات مع جميع الأعمدة المطلوبة
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'مكتمل',
  level TEXT DEFAULT 'ممتاز',
  icon_type TEXT DEFAULT 'trophy',
  image_url TEXT,
  achievement_type TEXT DEFAULT 'student',
  created_at TIMESTAMP DEFAULT NOW()
);

-- إضافة فهرس على created_at لسرعة الفرز
CREATE INDEX IF NOT EXISTS idx_achievements_created_at ON achievements(created_at);

-- تعليق توضيحي للأعمدة الجديدة
COMMENT ON COLUMN achievements.image_url IS 'رابط صورة الإنجاز';
COMMENT ON COLUMN achievements.achievement_type IS 'نوع الإنجاز: student (خاص بالطالب) أو public (عام)';
