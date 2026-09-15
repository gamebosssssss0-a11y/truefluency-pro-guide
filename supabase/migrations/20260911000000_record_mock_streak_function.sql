-- record_mock_streak: server-side streak/freeze logic for mock
-- submissions, WAT (Africa/Lagos) date math, SECURITY INVOKER so RLS
-- on profiles governs access. anon explicitly revoked — Supabase's
-- default privileges otherwise grant anon a direct EXECUTE right on
-- newly created functions, separate from PUBLIC.

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
AS $func$
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
$func$;

REVOKE ALL ON FUNCTION public.record_mock_streak(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_mock_streak(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_mock_streak(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mock_streak(integer) TO service_role;
