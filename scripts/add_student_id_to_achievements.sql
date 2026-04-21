-- إضافة عمود student_id إلى جدول الإنجازات مع ربطه بجدول الطلاب
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;

-- إضافة فهرس لسرعة البحث
CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON achievements(student_id);

-- تعليق توضيحي
COMMENT ON COLUMN achievements.student_id IS 'معرّف الطالب المرتبط بالإنجاز';
