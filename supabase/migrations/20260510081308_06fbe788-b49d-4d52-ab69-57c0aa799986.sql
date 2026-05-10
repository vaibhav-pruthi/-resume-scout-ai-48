
-- Candidates table
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  raw_text text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON public.candidates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert" ON public.candidates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.candidates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.candidates FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX candidates_user_idx ON public.candidates(user_id, created_at DESC);

-- Analyses table
CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_description text NOT NULL,
  ats_score int NOT NULL DEFAULT 0,
  technical_score int NOT NULL DEFAULT 0,
  communication_score int NOT NULL DEFAULT 0,
  experience_score int NOT NULL DEFAULT 0,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text NOT NULL DEFAULT 'review',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.analyses FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX analyses_candidate_idx ON public.analyses(candidate_id);
CREATE INDEX analyses_user_idx ON public.analyses(user_id, created_at DESC);

-- Storage bucket for resumes (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

CREATE POLICY "users read own resumes" ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own resumes" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own resumes" ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
