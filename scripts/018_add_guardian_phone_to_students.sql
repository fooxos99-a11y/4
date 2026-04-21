-- إضافة عمود رقم ولي الأمر لجدول students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- إضافة تعليق على العمود
COMMENT ON COLUMN students.guardian_phone IS 'رقم هاتف ولي الأمر (مع رمز الدولة، مثال: 966501234567)';
