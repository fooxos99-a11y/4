ALTER TABLE student_plans
ALTER COLUMN total_pages TYPE NUMERIC(6,1)
USING total_pages::NUMERIC(6,1);