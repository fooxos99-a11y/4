CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  halaqah text NOT NULL,
  exam_portion_label text NOT NULL,
  juz_number integer NOT NULL,
  exam_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notification_sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  completed_exam_id uuid NULL REFERENCES public.student_exams(id) ON DELETE SET NULL,
  completed_at timestamp with time zone NULL,
  cancelled_at timestamp with time zone NULL,
  scheduled_by_user_id uuid NULL,
  scheduled_by_name text NULL,
  scheduled_by_role text NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT exam_schedules_juz_number_check CHECK (juz_number >= 1 AND juz_number <= 30),
  CONSTRAINT exam_schedules_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS exam_schedules_student_id_idx ON public.exam_schedules(student_id);
CREATE INDEX IF NOT EXISTS exam_schedules_halaqah_idx ON public.exam_schedules(halaqah);
CREATE INDEX IF NOT EXISTS exam_schedules_status_idx ON public.exam_schedules(status);
CREATE INDEX IF NOT EXISTS exam_schedules_exam_date_idx ON public.exam_schedules(exam_date);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert exam schedules"
ON public.exam_schedules
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public select exam schedules"
ON public.exam_schedules
FOR SELECT
USING (true);

CREATE POLICY "Allow public update exam schedules"
ON public.exam_schedules
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete exam schedules"
ON public.exam_schedules
FOR DELETE
USING (true);