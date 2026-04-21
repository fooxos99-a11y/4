-- إضافة عمود achievement_type إذا لم يكن موجودًا
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS achievement_type text;
