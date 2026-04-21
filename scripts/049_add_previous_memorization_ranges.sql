ALTER TABLE student_plans
ADD COLUMN IF NOT EXISTS previous_memorization_ranges jsonb NULL;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS memorized_ranges jsonb NULL;