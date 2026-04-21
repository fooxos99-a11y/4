-- Add preferred_theme column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS preferred_theme VARCHAR(50) DEFAULT 'beige';

-- Update existing students to have beige as default
UPDATE students 
SET preferred_theme = 'beige' 
WHERE preferred_theme IS NULL;
