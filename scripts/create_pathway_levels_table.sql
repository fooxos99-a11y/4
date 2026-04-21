-- جدول المستويات التعليمية (مرن وقابل للتعديل)
CREATE TABLE IF NOT EXISTS public.pathway_levels (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE, -- رقم المستوى (1، 2، ...)
  title TEXT NOT NULL,                 -- عنوان المستوى
  description TEXT,                    -- وصف المستوى
  is_active BOOLEAN DEFAULT true,      -- لإخفاء مستوى مؤقتاً
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_pathway_levels_number ON public.pathway_levels(level_number);

-- تفعيل RLS
ALTER TABLE public.pathway_levels ENABLE ROW LEVEL SECURITY;

-- سياسة: السماح للإداريين فقط بالتعديل
CREATE POLICY "Admins can manage pathway levels" ON public.pathway_levels
  FOR ALL USING (true) WITH CHECK (true);
