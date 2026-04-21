-- Create frames table to store available frames
CREATE TABLE IF NOT EXISTS frames (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_frames table to track purchased frames
CREATE TABLE IF NOT EXISTS student_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  frame_id TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  UNIQUE(student_id, frame_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_frames_student_id ON student_frames(student_id);
CREATE INDEX IF NOT EXISTS idx_student_frames_active ON student_frames(student_id, is_active);

-- Added bat frame to database
INSERT INTO frames (id, name, description, price) VALUES
('frame_bat', 'إطار الخفافيش', 'إطار أسود مع ثلاث خفافيش متحركة', 5000);

-- Removed all frame INSERT statements - ready for new designs
-- No frames data - waiting for new frame designs to be added
