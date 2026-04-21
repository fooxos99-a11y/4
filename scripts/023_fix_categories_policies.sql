-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Teachers and admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Teachers and admins can update categories" ON categories;
DROP POLICY IF EXISTS "Teachers and admins can delete categories" ON categories;
DROP POLICY IF EXISTS "Teachers and admins can insert questions" ON category_questions;
DROP POLICY IF EXISTS "Teachers and admins can update questions" ON category_questions;
DROP POLICY IF EXISTS "Teachers and admins can delete questions" ON category_questions;

-- سياسات جديدة: السماح للجميع بالكتابة (مؤقتاً للتجربة)
-- يمكنك لاحقاً تحديد صلاحيات أدق

CREATE POLICY "Anyone can insert categories"
  ON categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON categories FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete categories"
  ON categories FOR DELETE
  USING (true);

CREATE POLICY "Anyone can insert questions"
  ON category_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update questions"
  ON category_questions FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete questions"
  ON category_questions FOR DELETE
  USING (true);
