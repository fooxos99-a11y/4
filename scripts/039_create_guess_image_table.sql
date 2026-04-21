-- إنشاء جدول لعبة خمن الصورة

-- جدول الصور
CREATE TABLE IF NOT EXISTS guess_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('سهل', 'متوسط', 'صعب')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE guess_images ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "Allow public read access to guess_images"
ON guess_images FOR SELECT
TO public
USING (active = true);

-- سياسة الإضافة والتعديل للمستخدمين المصرح لهم فقط
CREATE POLICY "Allow authenticated users to insert guess_images"
ON guess_images FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update guess_images"
ON guess_images FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete guess_images"
ON guess_images FOR DELETE
TO authenticated
USING (true);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_guess_images_active ON guess_images(active);
CREATE INDEX IF NOT EXISTS idx_guess_images_difficulty ON guess_images(difficulty);

-- تعليق على الجدول
COMMENT ON TABLE guess_images IS 'جدول صور لعبة خمن الصورة';
COMMENT ON COLUMN guess_images.image_url IS 'رابط الصورة الأساسية';
COMMENT ON COLUMN guess_images.answer IS 'الإجابة الصحيحة (اسم الصورة)';
COMMENT ON COLUMN guess_images.hint IS 'تلميح اختياري';
COMMENT ON COLUMN guess_images.difficulty IS 'مستوى الصعوبة';
COMMENT ON COLUMN guess_images.active IS 'فعّال أم لا';
