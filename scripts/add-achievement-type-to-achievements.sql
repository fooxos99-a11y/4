-- Add achievement_type column to achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS achievement_type TEXT DEFAULT 'student';

-- Add comment for clarity
COMMENT ON COLUMN achievements.achievement_type IS 'نوع الإنجاز: student (خاص بالطالب) أو public (عام)';
