CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code text NOT NULL,
  title text NOT NULL DEFAULT '',
  units integer,
  source text NOT NULL DEFAULT 'manual',
  test_settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_courses TO authenticated;
GRANT ALL ON public.user_courses TO service_role;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own courses" ON public.user_courses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_courses_set_updated_at BEFORE UPDATE ON public.user_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mock_attempts (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code text NOT NULL,
  course_title text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions jsonb,
  answers jsonb,
  settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_attempts TO authenticated;
GRANT ALL ON public.mock_attempts TO service_role;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own attempts" ON public.mock_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mock_attempts_set_updated_at BEFORE UPDATE ON public.mock_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_question_sets TO authenticated;
GRANT ALL ON public.ai_question_sets TO service_role;
ALTER TABLE public.ai_question_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own question sets" ON public.ai_question_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_question_sets_set_updated_at BEFORE UPDATE ON public.ai_question_sets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_topic_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code text NOT NULL,
  material_id text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_topic_analysis TO authenticated;
GRANT ALL ON public.course_topic_analysis TO service_role;
ALTER TABLE public.course_topic_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own topic analysis" ON public.course_topic_analysis FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER course_topic_analysis_set_updated_at BEFORE UPDATE ON public.course_topic_analysis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();