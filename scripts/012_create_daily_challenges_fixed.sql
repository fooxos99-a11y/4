-- Create daily_challenges table with simpler structure
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'ordering',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  challenge_data JSONB,
  correct_answer TEXT NOT NULL,
  points_reward INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

-- Create solutions table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_solutions_student ON public.daily_challenge_solutions(student_id, challenge_id);

-- Enable RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_solutions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read challenges (for students)
CREATE POLICY "Allow all to read challenges" ON public.daily_challenges
  FOR SELECT USING (true);

-- Allow everyone to insert challenges (for admins - will add proper auth later)
CREATE POLICY "Allow all to insert challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (true);

-- Allow everyone to update challenges (for admins - will add proper auth later)  
CREATE POLICY "Allow all to update challenges" ON public.daily_challenges
  FOR UPDATE USING (true);

-- Allow everyone to read solutions
CREATE POLICY "Allow all to read solutions" ON public.daily_challenge_solutions
  FOR SELECT USING (true);

-- Allow everyone to insert solutions
CREATE POLICY "Allow all to insert solutions" ON public.daily_challenge_solutions
  FOR INSERT WITH CHECK (true);
