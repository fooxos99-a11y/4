ALTER TABLE public.enrollment_requests
ADD COLUMN IF NOT EXISTS test_reviewed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS juz_test_results jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS juz_review_results jsonb NOT NULL DEFAULT '{}'::jsonb;