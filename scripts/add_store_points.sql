-- إضافة عمود store_points إلى جدول الطلاب إذا لم يكن موجودًا
ALTER TABLE students ADD COLUMN store_points integer DEFAULT 0;

-- مثال دالة SQL لإضافة نقاط للطالب (تضيف للنقطتين معًا)
CREATE OR REPLACE FUNCTION add_points(student_id uuid, amount integer) RETURNS void AS $$
BEGIN
  UPDATE students
  SET points = points + amount,
      store_points = store_points + amount
  WHERE id = student_id;
END;
$$ LANGUAGE plpgsql;

-- مثال استدعاء:
-- SELECT add_points('student-uuid', 10);