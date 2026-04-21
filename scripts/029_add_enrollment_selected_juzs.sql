ALTER TABLE public.enrollment_requests
ADD COLUMN IF NOT EXISTS selected_juzs integer[] NOT NULL DEFAULT '{}';