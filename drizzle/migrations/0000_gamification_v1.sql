CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  email text,
  goal text,
  timeline text,
  study_preference text,
  faculty text,
  department text,
  level integer,
  setup_complete boolean NOT NULL DEFAULT false,
  disclaimer_accepted boolean NOT NULL DEFAULT false,
  cgpa_intro_seen boolean NOT NULL DEFAULT false,
  streak_days integer NOT NULL DEFAULT 0,
  last_qualifying_day text,
  has_completed_first_mock boolean NOT NULL DEFAULT false,
  mastered_courses jsonb NOT NULL DEFAULT '[]'::jsonb,
  cgpa_inputs jsonb,
  cgpa_plan jsonb,
  cgpa_actual jsonb,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users manage their own profile'
  ) THEN
    CREATE POLICY "Users manage their own profile" ON public.profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS freezes_available integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS freeze_used_on date,
  ADD COLUMN IF NOT EXISTS tour_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_freezes_available_range
  CHECK (freezes_available BETWEEN 0 AND 2);

UPDATE public.profiles
SET last_active_date = last_qualifying_day::date
WHERE last_active_date IS NULL
  AND last_qualifying_day ~ '^\d{4}-\d{2}-\d{2}$';

CREATE OR REPLACE FUNCTION public.record_mock_streak(answered_count integer)
RETURNS TABLE (
  streak_days integer,
  last_active_date text,
  freezes_available integer,
  freeze_used_on text,
  event text,
  today_wat text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  v_streak integer;
  v_last date;
  v_freezes integer;
  v_freeze_used date;
  v_event text := 'none';
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF answered_count < 5 THEN RAISE EXCEPTION 'At least five answers are required'; END IF;

  INSERT INTO public.profiles (user_id, freezes_available)
  VALUES (v_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT p.streak_days, p.last_active_date, p.freezes_available, p.freeze_used_on
  INTO v_streak, v_last, v_freezes, v_freeze_used
  FROM public.profiles AS p
  WHERE p.user_id = v_user_id
  FOR UPDATE;

  IF v_last = v_today THEN
    v_event := 'none';
  ELSIF v_last IS NULL OR v_streak = 0 THEN
    v_streak := 1; v_last := v_today; v_event := 'incremented';
  ELSIF v_today = v_last + 1 THEN
    v_streak := v_streak + 1; v_last := v_today; v_event := 'incremented';
    IF v_streak = 7 THEN v_freezes := LEAST(2, v_freezes + 1); END IF;
  ELSIF v_today = v_last + 2 AND v_freezes > 0 THEN
    v_freezes := v_freezes - 1; v_freeze_used := v_today; v_last := v_today; v_event := 'protected';
  ELSE
    v_streak := 1; v_last := v_today; v_event := 'reset';
  END IF;

  UPDATE public.profiles AS p
  SET streak_days = v_streak,
      last_active_date = v_last,
      freezes_available = v_freezes,
      freeze_used_on = v_freeze_used
  WHERE p.user_id = v_user_id;

  RETURN QUERY SELECT v_streak, v_last::text, v_freezes, v_freeze_used::text, v_event, v_today::text;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mock_streak(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_mock_streak(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mock_streak(integer) TO service_role;