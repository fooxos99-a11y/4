-- Create daily_challenges table with all required columns
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL DEFAULT 'short_answer',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  challenge_data JSONB,
  correct_answer TEXT NOT NULL,
  points_reward INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create daily_challenge_solutions table to track student attempts
CREATE TABLE IF NOT EXISTS daily_challenge_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES daily_challenges(id),
  student_id VARCHAR(255),
  student_name VARCHAR(255),
  answer TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  solved_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_solutions_student ON daily_challenge_solutions(student_id, challenge_id);
