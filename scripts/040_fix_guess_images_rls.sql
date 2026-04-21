-- تعطيل RLS على جدول guess_images للسماح بالإضافة بدون مصادقة
ALTER TABLE guess_images DISABLE ROW LEVEL SECURITY;

-- أو إذا أردت الإبقاء على RLS مع السماح بالإضافة:
-- DROP POLICY IF EXISTS "Users can insert guess_images" ON guess_images;
-- DROP POLICY IF EXISTS "Users can update guess_images" ON guess_images;
-- DROP POLICY IF EXISTS "Users can delete guess_images" ON guess_images;

-- CREATE POLICY "Anyone can insert guess_images" ON guess_images
--   FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Anyone can update guess_images" ON guess_images
--   FOR UPDATE
--   USING (true);

-- CREATE POLICY "Anyone can delete guess_images" ON guess_images
--   FOR DELETE
--   USING (true);
