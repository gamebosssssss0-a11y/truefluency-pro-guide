-- Pending manual deployment: the Supabase migration tool was disabled.
-- Run once in the connected project's SQL Editor. Does not delete daily usage.
BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_token_windows (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  tokens bigint NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  turns integer NOT NULL DEFAULT 0 CHECK (turns >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);
GRANT SELECT ON public.chat_token_windows TO authenticated;
GRANT ALL ON public.chat_token_windows TO service_role;
ALTER TABLE public.chat_token_windows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_token_windows' AND policyname='Read own four-hour chat usage') THEN
    CREATE POLICY "Read own four-hour chat usage" ON public.chat_token_windows FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.chat_window_start(p_at timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT (date_trunc('day', p_at AT TIME ZONE 'Africa/Lagos') +
    make_interval(hours => (extract(hour FROM p_at AT TIME ZONE 'Africa/Lagos')::integer / 4) * 4)) AT TIME ZONE 'Africa/Lagos';
$$;
REVOKE ALL ON FUNCTION public.chat_window_start(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_window_start(timestamptz) TO authenticated, service_role;

-- Backward compatibility: existing daily RPC writes also populate the active
-- four-hour meter. Do not double-record those writes through the new RPC.
CREATE OR REPLACE FUNCTION public.mirror_chat_window_usage()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_tokens bigint; v_turns integer;
BEGIN
  v_tokens := greatest(0, NEW.tokens - CASE WHEN TG_OP='UPDATE' THEN OLD.tokens ELSE 0 END);
  v_turns := greatest(0, NEW.turns - CASE WHEN TG_OP='UPDATE' THEN OLD.turns ELSE 0 END);
  INSERT INTO public.chat_token_windows AS w (user_id,window_start,tokens,turns)
    VALUES (NEW.user_id,public.chat_window_start(now()),v_tokens,v_turns)
    ON CONFLICT (user_id,window_start) DO UPDATE SET
      tokens=w.tokens+excluded.tokens,turns=w.turns+excluded.turns,updated_at=now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.mirror_chat_window_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mirror_chat_window_usage() TO service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.chat_token_usage'::regclass AND tgname='mirror_chat_window_usage') THEN
    CREATE TRIGGER mirror_chat_window_usage AFTER INSERT OR UPDATE ON public.chat_token_usage FOR EACH ROW EXECUTE FUNCTION public.mirror_chat_window_usage();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.chat_tokens_add_window(p_user_id uuid,p_window_start timestamptz,p_tokens bigint,p_turns integer DEFAULT 0)
RETURNS bigint LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_total bigint;
BEGIN
  IF p_user_id IS NULL OR p_window_start IS NULL OR p_window_start <> public.chat_window_start(p_window_start) OR
    p_window_start > now() OR p_window_start < now() - interval '1 day' OR
    p_tokens IS NULL OR p_tokens < 0 OR p_tokens > 200000 OR p_turns IS NULL OR p_turns < 0 OR p_turns > 1 THEN
    RAISE EXCEPTION 'Invalid chat usage record';
  END IF;
  INSERT INTO public.chat_token_windows AS w (user_id,window_start,tokens,turns)
    VALUES (p_user_id,p_window_start,p_tokens,p_turns)
    ON CONFLICT (user_id,window_start) DO UPDATE SET
      tokens=w.tokens+excluded.tokens,turns=w.turns+excluded.turns,updated_at=now()
    RETURNING tokens INTO v_total;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_tokens_add_window(uuid,timestamptz,bigint,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_tokens_add_window(uuid,timestamptz,bigint,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.record_mock_streak(answered_count integer)
RETURNS TABLE(streak_days integer,last_active_date text,freezes_available integer,freeze_used_on text,event text,today_wat text)
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  v_streak integer; v_last date; v_freezes integer; v_freeze_used date; v_event text := 'none';
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF answered_count IS NULL OR answered_count < 1 OR answered_count > 100 THEN RAISE EXCEPTION 'At least one answer is required'; END IF;
  INSERT INTO public.profiles(user_id,freezes_available) VALUES(v_user_id,1) ON CONFLICT(user_id) DO NOTHING;
  SELECT coalesce(p.streak_days,0),p.last_active_date,coalesce(p.freezes_available,1),p.freeze_used_on
    INTO v_streak,v_last,v_freezes,v_freeze_used FROM public.profiles p WHERE p.user_id=v_user_id FOR UPDATE;
  IF v_last=v_today AND v_streak>0 THEN v_event := 'none';
  ELSIF v_last IS NULL OR v_streak=0 THEN v_streak:=1;v_last:=v_today;v_event:='incremented';
  ELSIF v_today=v_last+1 THEN
    v_streak:=v_streak+1;v_last:=v_today;v_event:='incremented';
    IF v_streak=7 THEN v_freezes:=least(2,v_freezes+1); END IF;
  ELSIF v_today=v_last+2 AND v_freezes>0 THEN
    v_freezes:=v_freezes-1;v_freeze_used:=v_today;v_last:=v_today;v_event:='protected';
  ELSE v_streak:=1;v_last:=v_today;v_event:='reset'; END IF;
  UPDATE public.profiles p SET streak_days=v_streak,last_active_date=v_last,freezes_available=v_freezes,freeze_used_on=v_freeze_used WHERE p.user_id=v_user_id;
  RETURN QUERY SELECT v_streak,v_last::text,v_freezes,v_freeze_used::text,v_event,v_today::text;
END;
$$;
REVOKE ALL ON FUNCTION public.record_mock_streak(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_mock_streak(integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.record_study_activity()
RETURNS TABLE(streak_days integer,last_active_date text,freezes_available integer,freeze_used_on text,event text,today_wat text)
LANGUAGE sql SET search_path = '' AS $$ SELECT * FROM public.record_mock_streak(1); $$;
REVOKE ALL ON FUNCTION public.record_study_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_study_activity() TO authenticated;

-- Clean up window data together with the existing account deletion lifecycle.
CREATE OR REPLACE FUNCTION public.remove_deleted_chat_windows()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN DELETE FROM public.chat_token_windows WHERE user_id=OLD.user_id; RETURN OLD; END;
$$;
REVOKE ALL ON FUNCTION public.remove_deleted_chat_windows() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.remove_deleted_chat_windows() TO service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.profiles'::regclass AND tgname='remove_deleted_chat_windows') THEN
    CREATE TRIGGER remove_deleted_chat_windows AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.remove_deleted_chat_windows();
  END IF;
END $$;
COMMIT;