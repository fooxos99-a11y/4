-- إضافة عمود نوع المحتوى لجدول pathway_contents في قاعدة بيانات Supabase
ALTER TABLE pathway_contents ADD COLUMN content_type TEXT NOT NULL DEFAULT 'link';
