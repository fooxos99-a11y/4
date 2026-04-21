CREATE TABLE IF NOT EXISTS student_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  halaqah TEXT NOT NULL,
  exam_portion_label TEXT NOT NULL,
  juz_number INTEGER,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  alerts_count INTEGER NOT NULL DEFAULT 0,
  mistakes_count INTEGER NOT NULL DEFAULT 0,
  prompts_count INTEGER NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL,
  alert_deduction NUMERIC(6,2) NOT NULL,
  mistake_deduction NUMERIC(6,2) NOT NULL,
  prompt_deduction NUMERIC(6,2) NOT NULL,
  total_deduction NUMERIC(6,2) NOT NULL,
  final_score NUMERIC(6,2) NOT NULL,
  min_passing_score NUMERIC(6,2) NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  tested_by_user_id UUID,
  tested_by_name TEXT,
  tested_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_exams_juz_number_check CHECK (juz_number IS NULL OR (juz_number >= 1 AND juz_number <= 30)),
  CONSTRAINT student_exams_alerts_count_check CHECK (alerts_count >= 0),
  CONSTRAINT student_exams_mistakes_count_check CHECK (mistakes_count >= 0),
  CONSTRAINT student_exams_prompts_count_check CHECK (prompts_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_student_exams_student_id ON student_exams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_halaqah ON student_exams(halaqah);
CREATE INDEX IF NOT EXISTS idx_student_exams_exam_date ON student_exams(exam_date DESC);

CREATE OR REPLACE FUNCTION set_student_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_exams_updated_at ON student_exams;
CREATE TRIGGER trg_student_exams_updated_at
BEFORE UPDATE ON student_exams
FOR EACH ROW
EXECUTE FUNCTION set_student_exams_updated_at();