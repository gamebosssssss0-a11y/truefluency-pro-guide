-- Avatar + per-file publish attribution fields (idempotent — safe to
-- run even though this schema is already live from a direct fix).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path text;

ALTER TABLE public.course_materials
  ADD COLUMN IF NOT EXISTS show_owner_name boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_owner_photo boolean NOT NULL DEFAULT false;
