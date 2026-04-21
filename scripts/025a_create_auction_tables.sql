-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS auction_questions CASCADE;
DROP TABLE IF EXISTS auction_categories CASCADE;

-- إنشاء جدول فئات المزاد
CREATE TABLE auction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول أسئلة المزاد
CREATE TABLE auction_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES auction_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE auction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_questions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Anyone can read auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Anyone can read auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can insert auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can update auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can delete auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can insert auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can update auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can delete auction questions" ON auction_questions;

-- سياسات القراءة للجميع
CREATE POLICY "Anyone can read auction categories"
  ON auction_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read auction questions"
  ON auction_questions FOR SELECT
  USING (true);

-- سياسات الكتابة للمعلمين والإداريين فقط
CREATE POLICY "Teachers and admins can insert auction categories"
  ON auction_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can update auction categories"
  ON auction_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can delete auction categories"
  ON auction_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can insert auction questions"
  ON auction_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can update auction questions"
  ON auction_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can delete auction questions"
  ON auction_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

-- إضافة فئات افتراضية
INSERT INTO auction_categories (name) VALUES
  ('القرآن الكريم'),
  ('السيرة النبوية'),
  ('الصحابة'),
  ('الفقه'),
  ('العقيدة'),
  ('التاريخ الإسلامي')
ON CONFLICT DO NOTHING;
