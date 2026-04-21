-- Create daily_challenges table with all required columns
CREATE TABLE IF NOT EXISTS daily_challenges (
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_daily_challenges_timestamp ON daily_challenges;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_daily_challenges_timestamp
BEFORE UPDATE ON daily_challenges
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
