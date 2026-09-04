-- Library Phase 1 schema: peer-sharing columns + share-link table.
-- (Originally applied directly against the live database; captured here
-- so a fresh migration run / project reset doesn't silently lose it.)

ALTER TABLE public.course_materials
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_peer_copy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS peer_alias text;

CREATE TABLE IF NOT EXISTS public.library_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  max_uses int NOT NULL DEFAULT 50,
  use_count int NOT NULL DEFAULT 0,
  is_revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their own shares" ON public.library_shares;
CREATE POLICY "Owners manage their own shares"
  ON public.library_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

REVOKE ALL ON public.library_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_shares TO authenticated;
GRANT ALL ON public.library_shares TO service_role;
