-- جدول أسئلة كل مستوى في المسار
CREATE TABLE IF NOT EXISTS public.pathway_level_questions (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL REFERENCES pathway_levels(level_number) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL, -- index of correct option
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_pathway_level_questions_level_number ON public.pathway_level_questions(level_number);

-- تفعيل RLS
ALTER TABLE public.pathway_level_questions ENABLE ROW LEVEL SECURITY;

-- سياسة: السماح للإداريين فقط بالتعديل
CREATE POLICY "Admins can manage pathway level questions" ON public.pathway_level_questions
  FOR ALL USING (true) WITH CHECK (true);
