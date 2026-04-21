-- Create teacher_attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    account_number BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, attendance_date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON public.teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON public.teacher_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_account ON public.teacher_attendance(account_number);

-- Enable Row Level Security
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.teacher_attendance;
CREATE POLICY "Enable read access for all users" ON public.teacher_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.teacher_attendance;
CREATE POLICY "Enable insert for authenticated users" ON public.teacher_attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.teacher_attendance;
CREATE POLICY "Enable update for authenticated users" ON public.teacher_attendance FOR UPDATE USING (true);
