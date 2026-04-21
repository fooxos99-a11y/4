-- Create student preferences table for storing frames and other customizations
CREATE TABLE IF NOT EXISTS public.student_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  active_frame TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_preferences_student_id ON public.student_preferences(student_id);

-- Enable Row Level Security
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this later)
CREATE POLICY "Enable all operations for authenticated users" ON public.student_preferences
  FOR ALL USING (true) WITH CHECK (true);
