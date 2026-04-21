CREATE TABLE IF NOT EXISTS public.recitation_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recitation_date date NOT NULL,
  recitation_end_date date NULL,
  halaqah text NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  created_by uuid NULL,
  created_by_name text NULL,
  archived_by uuid NULL,
  archived_by_name text NULL,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS recitation_days_open_unique_idx
  ON public.recitation_days ((status))
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS recitation_days_recitation_date_idx
  ON public.recitation_days(recitation_date DESC);

CREATE INDEX IF NOT EXISTS recitation_days_recitation_end_date_idx
  ON public.recitation_days(recitation_end_date DESC);

CREATE INDEX IF NOT EXISTS recitation_days_halaqah_idx
  ON public.recitation_days(halaqah);

CREATE TABLE IF NOT EXISTS public.recitation_day_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recitation_day_id uuid NOT NULL REFERENCES public.recitation_days(id) ON DELETE CASCADE,
  student_id uuid NULL,
  student_name text NOT NULL,
  account_number bigint NULL,
  halaqah text NULL,
  teacher_name text NULL,
  full_memorized_text text NOT NULL,
  scattered_parts_text text NULL,
  overall_status text NOT NULL DEFAULT 'not_listened' CHECK (overall_status IN ('not_listened', 'partial', 'completed', 'repeat', 'postponed')),
  evaluator_name text NULL,
  heard_amount_text text NULL,
  grade numeric(6,2) NULL,
  errors_count integer NOT NULL DEFAULT 0,
  alerts_count integer NOT NULL DEFAULT 0,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (recitation_day_id, student_id)
);

CREATE INDEX IF NOT EXISTS recitation_day_students_day_idx
  ON public.recitation_day_students(recitation_day_id);

CREATE INDEX IF NOT EXISTS recitation_day_students_halaqah_idx
  ON public.recitation_day_students(halaqah);

CREATE TABLE IF NOT EXISTS public.recitation_day_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recitation_day_student_id uuid NOT NULL REFERENCES public.recitation_day_students(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  portion_type text NOT NULL DEFAULT 'range' CHECK (portion_type IN ('juz', 'range')),
  label text NOT NULL,
  from_surah text NULL,
  from_verse text NULL,
  to_surah text NULL,
  to_verse text NULL,
  status text NOT NULL DEFAULT 'not_listened' CHECK (status IN ('not_listened', 'partial', 'completed', 'repeat', 'postponed')),
  evaluator_name text NULL,
  heard_amount_text text NULL,
  grade numeric(6,2) NULL,
  errors_count integer NOT NULL DEFAULT 0,
  alerts_count integer NOT NULL DEFAULT 0,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS recitation_day_portions_student_idx
  ON public.recitation_day_portions(recitation_day_student_id, sort_order);

ALTER TABLE public.recitation_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recitation_day_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recitation_day_portions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert recitation_days" ON public.recitation_days;
DROP POLICY IF EXISTS "Allow public select recitation_days" ON public.recitation_days;
DROP POLICY IF EXISTS "Allow public update recitation_days" ON public.recitation_days;
DROP POLICY IF EXISTS "Allow public delete recitation_days" ON public.recitation_days;

CREATE POLICY "Allow public insert recitation_days" ON public.recitation_days FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select recitation_days" ON public.recitation_days FOR SELECT USING (true);
CREATE POLICY "Allow public update recitation_days" ON public.recitation_days FOR UPDATE USING (true);
CREATE POLICY "Allow public delete recitation_days" ON public.recitation_days FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public insert recitation_day_students" ON public.recitation_day_students;
DROP POLICY IF EXISTS "Allow public select recitation_day_students" ON public.recitation_day_students;
DROP POLICY IF EXISTS "Allow public update recitation_day_students" ON public.recitation_day_students;
DROP POLICY IF EXISTS "Allow public delete recitation_day_students" ON public.recitation_day_students;

CREATE POLICY "Allow public insert recitation_day_students" ON public.recitation_day_students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select recitation_day_students" ON public.recitation_day_students FOR SELECT USING (true);
CREATE POLICY "Allow public update recitation_day_students" ON public.recitation_day_students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete recitation_day_students" ON public.recitation_day_students FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public insert recitation_day_portions" ON public.recitation_day_portions;
DROP POLICY IF EXISTS "Allow public select recitation_day_portions" ON public.recitation_day_portions;
DROP POLICY IF EXISTS "Allow public update recitation_day_portions" ON public.recitation_day_portions;
DROP POLICY IF EXISTS "Allow public delete recitation_day_portions" ON public.recitation_day_portions;

CREATE POLICY "Allow public insert recitation_day_portions" ON public.recitation_day_portions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select recitation_day_portions" ON public.recitation_day_portions FOR SELECT USING (true);
CREATE POLICY "Allow public update recitation_day_portions" ON public.recitation_day_portions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete recitation_day_portions" ON public.recitation_day_portions FOR DELETE USING (true);