CREATE OR REPLACE FUNCTION public.archive_active_semester_atomic(
  p_active_semester_id uuid,
  p_archived_semester_name text,
  p_archived_at timestamptz,
  p_archived_end_date date,
  p_archive_snapshot jsonb,
  p_student_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_update jsonb;
BEGIN
  FOR student_update IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_student_updates, '[]'::jsonb))
  LOOP
    UPDATE public.students
    SET points = COALESCE((student_update->>'points')::integer, points),
        store_points = COALESCE((student_update->>'store_points')::integer, store_points),
        memorized_start_surah = CASE
          WHEN student_update ? 'memorized_start_surah' THEN (student_update->>'memorized_start_surah')::integer
          ELSE memorized_start_surah
        END,
        memorized_start_verse = CASE
          WHEN student_update ? 'memorized_start_verse' THEN (student_update->>'memorized_start_verse')::integer
          ELSE memorized_start_verse
        END,
        memorized_end_surah = CASE
          WHEN student_update ? 'memorized_end_surah' THEN (student_update->>'memorized_end_surah')::integer
          ELSE memorized_end_surah
        END,
        memorized_end_verse = CASE
          WHEN student_update ? 'memorized_end_verse' THEN (student_update->>'memorized_end_verse')::integer
          ELSE memorized_end_verse
        END,
        memorized_ranges = CASE
          WHEN student_update ? 'memorized_ranges' THEN student_update->'memorized_ranges'
          ELSE memorized_ranges
        END
    WHERE id = (student_update->>'id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STUDENT_NOT_FOUND';
    END IF;
  END LOOP;

  UPDATE public.semesters
  SET name = p_archived_semester_name,
      status = 'archived',
      end_date = p_archived_end_date,
      archived_at = p_archived_at,
      archive_snapshot = p_archive_snapshot,
      updated_at = p_archived_at
  WHERE id = p_active_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SEMESTER_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exam_schedules'
  ) THEN
    UPDATE public.exam_schedules
    SET status = 'cancelled',
        cancelled_at = p_archived_at,
        updated_at = p_archived_at
    WHERE semester_id = p_active_semester_id
      AND status = 'scheduled';
  END IF;

  RETURN jsonb_build_object(
    'archived_semester_id', p_active_semester_id,
    'archived', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_active_semester_atomic(
  uuid,
  text,
  timestamptz,
  date,
  jsonb,
  jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_active_semester_atomic(
  uuid,
  text,
  timestamptz,
  date,
  jsonb,
  jsonb
) TO service_role;