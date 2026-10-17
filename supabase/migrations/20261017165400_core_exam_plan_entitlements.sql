-- Split the previous generic paid tier into the named Core and Exam plans.
-- Legacy paid accounts retain their access as Core.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

UPDATE public.subscriptions
SET tier = 'core'
WHERE tier = 'paid';

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('trial', 'free', 'core', 'exam'));

CREATE OR REPLACE FUNCTION public.has_full_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions AS s
    WHERE s.user_id = _user_id
      AND (
        (s.tier = 'trial' AND s.trial_ends_at > now())
        OR (
          s.tier IN ('core', 'exam')
          AND s.paid_until IS NOT NULL
          AND s.paid_until > now()
        )
      )
  )
$$;
