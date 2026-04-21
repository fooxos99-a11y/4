ALTER TABLE public.recitation_days
  ADD COLUMN IF NOT EXISTS halaqah text NULL;

WITH archive_halaqah_counts AS (
  SELECT
    recitation_day_id,
    MIN(halaqah) AS halaqah_name,
    COUNT(DISTINCT COALESCE(halaqah, '')) AS halaqah_count
  FROM public.recitation_day_students
  GROUP BY recitation_day_id
)
UPDATE public.recitation_days rd
SET halaqah = archive_halaqah_counts.halaqah_name
FROM archive_halaqah_counts
WHERE rd.id = archive_halaqah_counts.recitation_day_id
  AND archive_halaqah_counts.halaqah_count = 1
  AND rd.halaqah IS NULL;

CREATE INDEX IF NOT EXISTS recitation_days_halaqah_idx
  ON public.recitation_days(halaqah);