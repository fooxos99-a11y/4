ALTER TABLE student_plans
ADD COLUMN IF NOT EXISTS muraajaa_mode TEXT DEFAULT 'daily_fixed',
ADD COLUMN IF NOT EXISTS weekly_muraajaa_total_pages NUMERIC(6,1),
ADD COLUMN IF NOT EXISTS weekly_muraajaa_min_daily_pages NUMERIC(6,1),
ADD COLUMN IF NOT EXISTS weekly_muraajaa_start_day SMALLINT,
ADD COLUMN IF NOT EXISTS weekly_muraajaa_end_day SMALLINT;