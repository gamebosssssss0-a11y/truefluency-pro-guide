-- Keep uploaded course materials private to their owner.
-- Published copies are served through the server-side published-material query.
drop policy if exists "Admins can read all course materials" on public.course_materials;
