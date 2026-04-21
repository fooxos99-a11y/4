ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS memorized_start_surah integer,
  ADD COLUMN IF NOT EXISTS memorized_start_verse integer,
  ADD COLUMN IF NOT EXISTS memorized_end_surah integer,
  ADD COLUMN IF NOT EXISTS memorized_end_verse integer;
