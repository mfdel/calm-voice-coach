
-- Enable pgvector extension for semantic retrieval
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Knowledge articles: canonical curated problem entries
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_category TEXT NOT NULL,
  title TEXT NOT NULL,
  age_groups JSONB NOT NULL DEFAULT '["toddler","preschool","school_age"]'::jsonb,
  description TEXT,
  editorial_status TEXT NOT NULL DEFAULT 'published',
  source_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge snippets: retrieval-ready KB chunks
CREATE TABLE public.knowledge_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE NOT NULL,
  snippet_type TEXT NOT NULL DEFAULT 'strategy',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  applicable_triggers JSONB DEFAULT '[]'::jsonb,
  blocked_by_red_lines JSONB DEFAULT '[]'::jsonb,
  success_signals JSONB DEFAULT '[]'::jsonb,
  weight REAL NOT NULL DEFAULT 1.0,
  embedding extensions.vector(768),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retrieval events: traceability for what was retrieved
CREATE TABLE public.retrieval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  query_text TEXT,
  query_filters JSONB,
  top_results JSONB,
  retrieval_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompt runs: observability without logging full private prompts
CREATE TABLE public.prompt_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  prompt_version TEXT DEFAULT 'v1',
  model_name TEXT,
  input_token_estimate INTEGER,
  output_token_count INTEGER,
  response_valid BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  red_line_violation_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for knowledge tables (public read for authenticated users)
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrieval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KB articles"
  ON public.knowledge_articles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read KB snippets"
  ON public.knowledge_snippets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view own retrieval events"
  ON public.retrieval_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM incidents WHERE incidents.id = retrieval_events.incident_id AND incidents.user_id = auth.uid()));

CREATE POLICY "System can insert retrieval events"
  ON public.retrieval_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM incidents WHERE incidents.id = retrieval_events.incident_id AND incidents.user_id = auth.uid()));

CREATE POLICY "Users can view own prompt runs"
  ON public.prompt_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM incidents WHERE incidents.id = prompt_runs.incident_id AND incidents.user_id = auth.uid()));

CREATE POLICY "System can insert prompt runs"
  ON public.prompt_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM incidents WHERE incidents.id = prompt_runs.incident_id AND incidents.user_id = auth.uid()));

-- Indexes per V1_DATA_MODEL.md
CREATE INDEX idx_kb_articles_problem_category ON public.knowledge_articles(problem_category);
CREATE INDEX idx_kb_snippets_article_id ON public.knowledge_snippets(article_id);
