CREATE OR REPLACE FUNCTION public.remove_student_memorized_range_atomic(
  p_student_id uuid,
  p_semester_id uuid,
  p_has_previous boolean,
  p_prev_start_surah integer,
  p_prev_start_verse integer,
  p_prev_end_surah integer,
  p_prev_end_verse integer,
  p_previous_memorization_ranges jsonb,
  p_completed_juzs integer[],
  p_current_juzs integer[],
  p_removed_completed_juzs integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_student public.students%ROWTYPE;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'student_exams'
  ) AND COALESCE(array_length(p_removed_completed_juzs, 1), 0) > 0 THEN
    DELETE FROM public.student_exams
    WHERE student_id = p_student_id
      AND semester_id = p_semester_id
      AND passed = true
      AND juz_number = ANY(p_removed_completed_juzs);
  END IF;

  UPDATE public.students
  SET memorized_start_surah = p_prev_start_surah,
      memorized_start_verse = p_prev_start_verse,
      memorized_end_surah = p_prev_end_surah,
      memorized_end_verse = p_prev_end_verse,
      memorized_ranges = p_previous_memorization_ranges,
      completed_juzs = COALESCE(p_completed_juzs, '{}'::integer[]),
      current_juzs = COALESCE(p_current_juzs, '{}'::integer[])
  WHERE id = p_student_id
  RETURNING * INTO updated_student;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  UPDATE public.student_plans
  SET has_previous = p_has_previous,
      prev_start_surah = p_prev_start_surah,
      prev_start_verse = p_prev_start_verse,
      prev_end_surah = p_prev_end_surah,
      prev_end_verse = p_prev_end_verse,
      previous_memorization_ranges = p_previous_memorization_ranges
  WHERE student_id = p_student_id
    AND semester_id = p_semester_id;

  RETURN to_jsonb(updated_student);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_student_memorized_range_atomic(
  uuid,
  uuid,
  boolean,
  integer,
  integer,
  integer,
  integer,
  jsonb,
  integer[],
  integer[],
  integer[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_student_memorized_range_atomic(
  uuid,
  uuid,
  boolean,
  integer,
  integer,
  integer,
  integer,
  jsonb,
  integer[],
  integer[],
  integer[]
) TO service_role;
