-- Create letter hive questions table
CREATE TABLE IF NOT EXISTS letter_hive_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

-- Create used questions tracking table
CREATE TABLE IF NOT EXISTS letter_hive_used_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id TEXT NOT NULL,
  question_id UUID REFERENCES letter_hive_questions(id),
  user_id UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create game sessions table
CREATE TABLE IF NOT EXISTS letter_hive_sessions (
  id TEXT PRIMARY KEY,
  board_state JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP WITH TIME ZONE,
  winner TEXT CHECK (winner IN ('orange', 'green', NULL))
);

-- Insert sample questions for each Arabic letter
INSERT INTO letter_hive_questions (letter, question) VALUES
('ا', 'ما هو أول حرف في الأبجدية العربية؟'),
('ب', 'ما هو اسم الحيوان الذي يعيش في الصحراء ويبدأ بحرف الباء؟'),
('ت', 'أكمل: التفاح فاكهة ...؟'),
('ث', 'ما هو الحيوان الذي يزحف ويبدأ بحرف الثاء؟'),
('ج', 'ما هو المكان الذي نصلي فيه ويبدأ بحرف الجيم؟'),
('ح', 'من هو الحيوان الذي يعطينا الحليب ويبدأ بحرف الحاء؟'),
('خ', 'ما هو اسم الفاكهة الخضراء التي تبدأ بحرف الخاء؟'),
('د', 'ما هو الحيوان الذي ينبح ويبدأ بحرف الدال؟'),
('ذ', 'أكمل: الذهب معدن ...؟'),
('ر', 'ما هو فصل السنة الذي ينزل فيه المطر؟'),
('ز', 'ما هو اسم الزهرة الجميلة التي لها شوك؟'),
('س', 'ما هو اسم المركبة التي تسير على الطريق؟'),
('ش', 'ما هو الشيء الذي ينير لنا في السماء ليلاً؟'),
('ص', 'ما هي الفاكهة الصفراء التي لها قشرة؟'),
('ض', 'ما هو الحيوان المفترس الذي يعيش في الغابة؟'),
('ط', 'ما هو الطائر الذي لا يطير ويعيش في القطب الجنوبي؟'),
('ظ', 'أكمل: الظل يظهر عند وجود ...؟'),
('ع', 'ما هو الطائر الذي يعيش في الأشجار؟'),
('غ', 'ما هو المكان الذي نزرع فيه الأشجار والنباتات؟'),
('ف', 'ما هي الفاكهة الحمراء التي نأكلها في الصيف؟'),
('ق', 'ما هو اسم الحيوان الذي يعيش في القفص؟'),
('ك', 'ما هو الشيء الذي نقرأ فيه الحروف والكلمات؟'),
('ل', 'ما هو الطعام الأبيض الذي نشربه؟'),
('م', 'ما هو المكان الذي نتعلم فيه؟'),
('ن', 'ما هو الشيء الذي يشع ضوءاً ويبدأ بحرف النون؟'),
('ه', 'أكمل: الهواء ضروري لـ ...؟'),
('و', 'ما هو العضو الذي نسمع به؟'),
('ي', 'ما هو الجزء من الجسم الذي نمسك به الأشياء؟');

-- Enable RLS
ALTER TABLE letter_hive_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_hive_used_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_hive_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read questions"
  ON letter_hive_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and admins can insert questions"
  ON letter_hive_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Anyone can track used questions"
  ON letter_hive_used_questions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can manage game sessions"
  ON letter_hive_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
