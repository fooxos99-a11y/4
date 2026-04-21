ALTER TABLE public.student_exams
  ADD COLUMN IF NOT EXISTS portion_type text NOT NULL DEFAULT 'juz',
  ADD COLUMN IF NOT EXISTS portion_number integer NULL;

UPDATE public.student_exams
SET portion_type = 'juz'
WHERE portion_type IS NULL;

UPDATE public.student_exams
SET portion_number = juz_number
WHERE portion_number IS NULL;

ALTER TABLE public.student_exams
  ALTER COLUMN portion_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_exams_portion_type_check'
  ) THEN
    ALTER TABLE public.student_exams
      ADD CONSTRAINT student_exams_portion_type_check CHECK (portion_type IN ('juz', 'hizb'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS student_exams_portion_idx
  ON public.student_exams(semester_id, student_id, portion_type, portion_number);

ALTER TABLE public.exam_schedules
  ADD COLUMN IF NOT EXISTS portion_type text NOT NULL DEFAULT 'juz',
  ADD COLUMN IF NOT EXISTS portion_number integer NULL;

UPDATE public.exam_schedules
SET portion_type = 'juz'
WHERE portion_type IS NULL;

UPDATE public.exam_schedules
SET portion_number = juz_number
WHERE portion_number IS NULL;

ALTER TABLE public.exam_schedules
  ALTER COLUMN portion_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_schedules_portion_type_check'
  ) THEN
    ALTER TABLE public.exam_schedules
      ADD CONSTRAINT exam_schedules_portion_type_check CHECK (portion_type IN ('juz', 'hizb'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS exam_schedules_portion_idx
  ON public.exam_schedules(semester_id, student_id, portion_type, portion_number, status);