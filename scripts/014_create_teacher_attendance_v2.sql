-- Create teacher_attendance table to track when teachers check in/out
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  account_number BIGINT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'present', -- present, absent, excused
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, attendance_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_account_number ON teacher_attendance(account_number);
