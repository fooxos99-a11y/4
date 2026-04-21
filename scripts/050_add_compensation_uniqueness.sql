DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance_records'
      AND column_name = 'semester_id'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_unique_compensation_per_day_idx
      ON public.attendance_records(student_id, semester_id, date)
      WHERE is_compensation = true
    ';
  ELSE
    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_unique_compensation_per_day_legacy_idx
      ON public.attendance_records(student_id, date)
      WHERE is_compensation = true
    ';
  END IF;
END $$;