ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public delete semesters" ON public.semesters;

CREATE POLICY "Allow public delete semesters"
ON public.semesters
FOR DELETE
USING (true);