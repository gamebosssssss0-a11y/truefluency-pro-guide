
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image','pdf')),
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  extracted_content TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (extraction_status IN ('not_applicable','pending','success','failed','scanned_pdf')),
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX course_materials_user_course_idx ON public.course_materials(user_id, course_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT ALL ON public.course_materials TO service_role;

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own course materials"
  ON public.course_materials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage policies for course-materials bucket: user_id is the first path segment
CREATE POLICY "Users can read their own course-materials files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload to their own course-materials folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own course-materials files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own course-materials files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
