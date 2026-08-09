ALTER TABLE public.user_courses
  ADD COLUMN status text NOT NULL DEFAULT 'Compulsory',
  ADD COLUMN label_override text;