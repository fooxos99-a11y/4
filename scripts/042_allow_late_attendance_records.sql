DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'attendance_records'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present', 'late', 'absent', 'excused'));
END $$;
