-- إنشاء جدول الأسئلة المستخدمة
CREATE TABLE IF NOT EXISTS used_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL, -- 'auction' أو 'categories'
  question_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_type, question_id)
);

-- إنشاء فهرس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_used_questions_user_game ON used_questions(user_id, game_type);

-- تمكين RLS
ALTER TABLE used_questions ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - المستخدم يقرأ أسئلته فقط
CREATE POLICY "Users can read their own used questions"
  ON used_questions FOR SELECT
  USING (auth.uid() = user_id);

-- سياسة الإضافة - المستخدم يضيف لنفسه فقط
CREATE POLICY "Users can insert their own used questions"
  ON used_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- سياسة الحذف - المستخدم يحذف أسئلته فقط
CREATE POLICY "Users can delete their own used questions"
  ON used_questions FOR DELETE
  USING (auth.uid() = user_id);
