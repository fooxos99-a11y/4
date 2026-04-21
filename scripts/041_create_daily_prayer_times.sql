CREATE TABLE IF NOT EXISTS public.daily_prayer_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prayer_date DATE NOT NULL,
    city_id TEXT NOT NULL,
    city_name TEXT NOT NULL,
    prayer_name TEXT NOT NULL,
    prayer_time TEXT NOT NULL,
    source TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(prayer_date, city_name, prayer_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_prayer_times_date ON public.daily_prayer_times(prayer_date);
CREATE INDEX IF NOT EXISTS idx_daily_prayer_times_city_prayer ON public.daily_prayer_times(city_name, prayer_name);

ALTER TABLE public.daily_prayer_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow daily prayer times select" ON public.daily_prayer_times;
CREATE POLICY "Allow daily prayer times select"
ON public.daily_prayer_times FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow daily prayer times insert" ON public.daily_prayer_times;
CREATE POLICY "Allow daily prayer times insert"
ON public.daily_prayer_times FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow daily prayer times update" ON public.daily_prayer_times;
CREATE POLICY "Allow daily prayer times update"
ON public.daily_prayer_times FOR UPDATE
USING (true);