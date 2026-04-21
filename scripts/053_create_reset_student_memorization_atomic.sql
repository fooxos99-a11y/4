CREATE OR REPLACE FUNCTION public.reset_student_memorization_atomic(
  p_student_id uuid,
  p_semester_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_student public.students%ROWTYPE;
BEGIN
  DELETE FROM public.student_plans
  WHERE student_id = p_student_id
    AND semester_id = p_semester_id;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'student_exams'
  ) THEN
    DELETE FROM public.student_exams
    WHERE student_id = p_student_id
      AND semester_id = p_semester_id
      AND passed = true;
  END IF;

  UPDATE public.students
  SET memorized_start_surah = NULL,
      memorized_start_verse = NULL,
      memorized_end_surah = NULL,
      memorized_end_verse = NULL,
      memorized_ranges = NULL,
      completed_juzs = '{}'::integer[],
      current_juzs = '{}'::integer[]
  WHERE id = p_student_id
  RETURNING * INTO updated_student;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  RETURN to_jsonb(updated_student);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_student_memorization_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_student_memorization_atomic(uuid, uuid) TO service_role;
