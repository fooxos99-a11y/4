-- Create level_status table to track which levels are unlocked
CREATE TABLE IF NOT EXISTS level_status (
  id SERIAL PRIMARY KEY,
  level_id INTEGER NOT NULL UNIQUE,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  unlocked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default data for all 10 levels (only level 1 is unlocked by default)
INSERT INTO level_status (level_id, is_unlocked)
VALUES 
  (1, TRUE),
  (2, FALSE),
  (3, FALSE),
  (4, FALSE),
  (5, FALSE),
  (6, FALSE),
  (7, FALSE),
  (8, FALSE),
  (9, FALSE),
  (10, FALSE)
ON CONFLICT (level_id) DO NOTHING;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_level_status_level_id ON level_status(level_id);
CREATE INDEX IF NOT EXISTS idx_level_status_unlocked ON level_status(is_unlocked);
