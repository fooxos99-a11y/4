-- Create teacher_attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  account_number BIGINT NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, attendance_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date ON teacher_attendance(teacher_id, attendance_date);
