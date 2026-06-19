
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT NOT NULL DEFAULT 'Beginner',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view published or own courses" ON public.courses FOR SELECT TO authenticated USING (published = true OR instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "instructors create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (instructor_id = auth.uid() AND (public.has_role(auth.uid(),'instructor') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "instructors update own course" ON public.courses FOR UPDATE TO authenticated USING (instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "instructors delete own course" ON public.courses FOR DELETE TO authenticated USING (instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view modules of viewable courses" ON public.modules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.published OR c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage modules" ON public.modules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  position INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view lessons of viewable courses" ON public.lessons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND (c.published OR c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage lessons" ON public.lessons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND (c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND (c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own or course instructor enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.instructor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "self enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "self unenroll" ON public.enrollments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Lesson progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
GRANT SELECT, INSERT, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own progress or instructor" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE l.id=lesson_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "mark own progress" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "unmark own progress" ON public.lesson_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_score INT NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view quizzes of viewable lessons" ON public.quizzes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE l.id=lesson_id AND (c.published OR c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage quizzes" ON public.quizzes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE l.id=lesson_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE l.id=lesson_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view quiz questions" ON public.quiz_questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id=q.lesson_id JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE q.id=quiz_id AND (c.published OR c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage quiz questions" ON public.quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id=q.lesson_id JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE q.id=quiz_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id=q.lesson_id JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE q.id=quiz_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  answers JSONB NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own attempts or instructor" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id=q.lesson_id JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id WHERE q.id=quiz_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "submit own attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INT NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view assignments of viewable courses" ON public.assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.published OR c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage assignments" ON public.assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  grade INT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own submission or instructor" ON public.assignment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id=a.course_id WHERE a.id=assignment_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "submit own assignment" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own or instructor grade" ON public.assignment_submissions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id=a.course_id WHERE a.id=assignment_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view announcements of viewable courses" ON public.announcements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.published OR c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "instructor manage announcements" ON public.announcements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND (c.instructor_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Helper: allow user to claim instructor role for themselves (so anyone can switch to teaching mode)
CREATE OR REPLACE FUNCTION public.become_instructor()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'instructor') ON CONFLICT DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.become_instructor() TO authenticated;
