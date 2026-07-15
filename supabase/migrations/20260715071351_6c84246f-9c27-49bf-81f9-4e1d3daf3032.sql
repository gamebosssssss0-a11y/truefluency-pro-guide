DROP POLICY IF EXISTS "Users manage their own course materials" ON public.course_materials;
CREATE POLICY "Users manage their own course materials"
  ON public.course_materials FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);