-- أضف عمود direction لجدول student_plans
ALTER TABLE student_plans ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'asc';
