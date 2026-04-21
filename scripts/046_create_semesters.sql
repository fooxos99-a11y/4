CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  archived_at timestamp with time zone NULL,
  archive_snapshot jsonb NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT semesters_status_check CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS semesters_single_active_idx
ON public.semesters(status)
WHERE status = 'active';

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert semesters" ON public.semesters;

CREATE POLICY "Allow public insert semesters"
ON public.semesters
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select semesters" ON public.semesters;

CREATE POLICY "Allow public select semesters"
ON public.semesters
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public update semesters" ON public.semesters;

CREATE POLICY "Allow public update semesters"
ON public.semesters
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow public delete semesters" ON public.semesters;

CREATE POLICY "Allow public delete semesters"
ON public.semesters
FOR DELETE
USING (true);

DO $$
DECLARE
  active_semester_id uuid;
  current_day date := CURRENT_DATE;
BEGIN
  SELECT id INTO active_semester_id
  FROM public.semesters
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_semester_id IS NULL THEN
    INSERT INTO public.semesters (name, status, start_date)
    VALUES ('الفصل الحالي', 'active', CURRENT_DATE)
    RETURNING id INTO active_semester_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_plans'
  ) THEN
    ALTER TABLE public.student_plans ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;
    UPDATE public.student_plans SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_exams'
  ) THEN
    ALTER TABLE public.student_exams ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;
    UPDATE public.student_exams SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exam_schedules'
  ) THEN
    ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;
    UPDATE public.exam_schedules SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendance_records'
  ) THEN
    ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;

    UPDATE public.attendance_records AS attendance
    SET semester_id = (
      SELECT s.id
      FROM public.semesters AS s
      WHERE attendance.date >= s.start_date
        AND attendance.date <= COALESCE(s.end_date, current_day)
      ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, s.start_date DESC, s.created_at DESC
      LIMIT 1
    )
    WHERE attendance.semester_id IS NULL;

    UPDATE public.attendance_records SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_invoices'
  ) THEN
    ALTER TABLE public.finance_invoices ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;

    UPDATE public.finance_invoices AS invoice
    SET semester_id = (
      SELECT s.id
      FROM public.semesters AS s
      WHERE invoice.issue_date >= s.start_date
        AND invoice.issue_date <= COALESCE(s.end_date, current_day)
      ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, s.start_date DESC, s.created_at DESC
      LIMIT 1
    )
    WHERE invoice.semester_id IS NULL;

    UPDATE public.finance_invoices SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_expenses'
  ) THEN
    ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;

    UPDATE public.finance_expenses AS expense
    SET semester_id = (
      SELECT s.id
      FROM public.semesters AS s
      WHERE expense.expense_date >= s.start_date
        AND expense.expense_date <= COALESCE(s.end_date, current_day)
      ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, s.start_date DESC, s.created_at DESC
      LIMIT 1
    )
    WHERE expense.semester_id IS NULL;

    UPDATE public.finance_expenses SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_incomes'
  ) THEN
    ALTER TABLE public.finance_incomes ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;

    UPDATE public.finance_incomes AS income
    SET semester_id = (
      SELECT s.id
      FROM public.semesters AS s
      WHERE income.income_date >= s.start_date
        AND income.income_date <= COALESCE(s.end_date, current_day)
      ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, s.start_date DESC, s.created_at DESC
      LIMIT 1
    )
    WHERE income.semester_id IS NULL;

    UPDATE public.finance_incomes SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_trips'
  ) THEN
    ALTER TABLE public.finance_trips ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL;

    UPDATE public.finance_trips AS trip
    SET semester_id = (
      SELECT s.id
      FROM public.semesters AS s
      WHERE trip.trip_date >= s.start_date
        AND trip.trip_date <= COALESCE(s.end_date, current_day)
      ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, s.start_date DESC, s.created_at DESC
      LIMIT 1
    )
    WHERE trip.semester_id IS NULL;

    UPDATE public.finance_trips SET semester_id = active_semester_id WHERE semester_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS student_plans_semester_id_idx ON public.student_plans(semester_id);
CREATE INDEX IF NOT EXISTS student_exams_semester_id_idx ON public.student_exams(semester_id);
CREATE INDEX IF NOT EXISTS exam_schedules_semester_id_idx ON public.exam_schedules(semester_id);
CREATE INDEX IF NOT EXISTS attendance_records_semester_id_idx ON public.attendance_records(semester_id);
CREATE INDEX IF NOT EXISTS finance_invoices_semester_id_idx ON public.finance_invoices(semester_id);
CREATE INDEX IF NOT EXISTS finance_expenses_semester_id_idx ON public.finance_expenses(semester_id);
CREATE INDEX IF NOT EXISTS finance_incomes_semester_id_idx ON public.finance_incomes(semester_id);
CREATE INDEX IF NOT EXISTS finance_trips_semester_id_idx ON public.finance_trips(semester_id);