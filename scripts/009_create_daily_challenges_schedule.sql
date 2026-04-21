-- Create table for weekly schedule of daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_challenges_schedule_day ON daily_challenges_schedule(day_of_week);

-- Enable Row Level Security
ALTER TABLE daily_challenges_schedule ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage schedule
CREATE POLICY "Allow admins to view schedule" ON daily_challenges_schedule FOR SELECT USING (TRUE);
CREATE POLICY "Allow admins to manage schedule" ON daily_challenges_schedule FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
