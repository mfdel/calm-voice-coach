
-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  locale TEXT DEFAULT 'en-US',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Child profiles
CREATE TABLE public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  birth_date DATE,
  age_group TEXT NOT NULL DEFAULT 'toddler',
  known_triggers JSONB DEFAULT '[]'::jsonb,
  calming_preferences JSONB DEFAULT '[]'::jsonb,
  development_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own children" ON public.child_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parenting preferences
CREATE TABLE public.parenting_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style TEXT DEFAULT 'gentle',
  parenting_values JSONB DEFAULT '["connection","clear_boundaries"]'::jsonb,
  tone_preferences JSONB DEFAULT '["calm","direct"]'::jsonb,
  household_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.parenting_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.parenting_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Red lines
CREATE TABLE public.red_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'hard_stop',
  label TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.red_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own red lines" ON public.red_lines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Incidents (SOS sessions)
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE SET NULL,
  problem_category TEXT NOT NULL,
  note_text TEXT,
  input_mode TEXT DEFAULT 'text',
  context_signals JSONB DEFAULT '[]'::jsonb,
  summary_text TEXT,
  used_fallback BOOLEAN DEFAULT false,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own incidents" ON public.incidents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Incident suggestions
CREATE TABLE public.incident_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  reason TEXT,
  script TEXT,
  source_type TEXT DEFAULT 'llm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own suggestions" ON public.incident_suggestions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_suggestions.incident_id AND incidents.user_id = auth.uid()));
CREATE POLICY "System inserts suggestions" ON public.incident_suggestions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_suggestions.incident_id AND incidents.user_id = auth.uid()));

-- Incident feedback (debrief)
CREATE TABLE public.incident_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  reason_tags JSONB DEFAULT '[]'::jsonb,
  feedback_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(incident_id)
);
ALTER TABLE public.incident_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.incident_feedback FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_feedback.incident_id AND incidents.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_feedback.incident_id AND incidents.user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_child_profiles_user_id ON public.child_profiles(user_id);
CREATE INDEX idx_incidents_user_created ON public.incidents(user_id, created_at DESC);
CREATE INDEX idx_incidents_problem_category ON public.incidents(problem_category);
CREATE INDEX idx_incident_feedback_incident ON public.incident_feedback(incident_id);
CREATE INDEX idx_red_lines_user_id ON public.red_lines(user_id);
