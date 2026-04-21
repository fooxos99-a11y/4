-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  day_of_week INTEGER,
  type VARCHAR(50) NOT NULL DEFAULT 'ordering',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  challenge_data JSONB,
  correct_answer TEXT NOT NULL,
  points_reward INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

-- Create daily_challenge_solutions table to track student attempts
CREATE TABLE IF NOT EXISTS public.daily_challenge_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL,
  student_name VARCHAR(255),
  answer TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  solved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(challenge_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_day_of_week ON public.daily_challenges(day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_solutions_student ON public.daily_challenge_solutions(student_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_solutions_challenge ON public.daily_challenge_solutions(challenge_id);

-- Enable Row Level Security
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_solutions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all authenticated users to read, only admins to write)
CREATE POLICY "Allow all users to read challenges" ON public.daily_challenges
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to write challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read solutions" ON public.daily_challenge_solutions
  FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own solutions" ON public.daily_challenge_solutions
  FOR INSERT WITH CHECK (true);
