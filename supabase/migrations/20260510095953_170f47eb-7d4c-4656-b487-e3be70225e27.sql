ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS hr_notes text;

CREATE TABLE IF NOT EXISTS public.candidate_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csh_candidate ON public.candidate_status_history(candidate_id, created_at DESC);

ALTER TABLE public.candidate_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read" ON public.candidate_status_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner insert" ON public.candidate_status_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner delete" ON public.candidate_status_history
  FOR DELETE USING (auth.uid() = user_id);
