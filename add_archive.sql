ALTER TABLE students ADD COLUMN IF NOT EXISTS completed_juzs integer[] DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_juzs integer[] DEFAULT '{}';
ALTER TABLE student_plans ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
