-- Create stars table to store student star selections
CREATE TABLE IF NOT EXISTS student_stars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  star_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_stars_student_id ON student_stars(student_id);

-- Add RLS policies
ALTER TABLE student_stars ENABLE ROW LEVEL SECURITY;

-- Allow all users to read stars
CREATE POLICY "Allow public read access to stars" ON student_stars
  FOR SELECT
  USING (true);

-- Allow all users to insert/update their own stars
CREATE POLICY "Allow users to insert stars" ON student_stars
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update stars" ON student_stars
  FOR UPDATE
  USING (true);
