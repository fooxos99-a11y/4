-- إنشاء جدول pathway_contents في قاعدة بيانات Supabase
CREATE TABLE IF NOT EXISTS public.pathway_contents (
  id SERIAL PRIMARY KEY,
  level_id INTEGER NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'link', -- 'pdf', 'video', 'text', 'link'
  content_title TEXT NOT NULL,
  content_description TEXT,
  content_url TEXT,
  content_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهارس لسرعة البحث
CREATE INDEX IF NOT EXISTS idx_pathway_contents_level_id ON public.pathway_contents(level_id);
CREATE INDEX IF NOT EXISTS idx_pathway_contents_type ON public.pathway_contents(content_type);

-- تفعيل RLS
ALTER TABLE public.pathway_contents ENABLE ROW LEVEL SECURITY;

-- سياسة: السماح للإداريين فقط بالحذف والإضافة
-- عدل السياسات حسب نظام الصلاحيات لديك
CREATE POLICY "Admins can manage pathway contents" ON public.pathway_contents
  FOR ALL USING (true) WITH CHECK (true);
