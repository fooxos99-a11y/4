-- إضافة حقول الخلفية والخط إلى جدول التفضيلات
ALTER TABLE public.student_preferences 
ADD COLUMN IF NOT EXISTS active_background TEXT,
ADD COLUMN IF NOT EXISTS active_font TEXT;
