-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    challenge_data JSONB,
    correct_answer TEXT,
    points_reward INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(date);

-- Enable RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read challenges
CREATE POLICY "Anyone can read challenges" ON public.daily_challenges
    FOR SELECT USING (true);

-- Allow admins to insert/update challenges (you can adjust this based on your auth setup)
CREATE POLICY "Anyone can insert challenges" ON public.daily_challenges
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update challenges" ON public.daily_challenges
    FOR UPDATE USING (true);

-- Create challenge_submissions table to track who solved what
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT,
    submitted_answer TEXT,
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(challenge_id, student_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_student ON public.challenge_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);

-- Enable RLS
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read and insert submissions
CREATE POLICY "Anyone can read submissions" ON public.challenge_submissions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert submissions" ON public.challenge_submissions
    FOR INSERT WITH CHECK (true);
