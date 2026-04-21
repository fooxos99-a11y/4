ALTER TABLE public.recitation_days
  ADD COLUMN IF NOT EXISTS recitation_end_date date NULL;

UPDATE public.recitation_days
SET recitation_end_date = recitation_date
WHERE recitation_end_date IS NULL;

CREATE INDEX IF NOT EXISTS recitation_days_recitation_end_date_idx
  ON public.recitation_days(recitation_end_date DESC);