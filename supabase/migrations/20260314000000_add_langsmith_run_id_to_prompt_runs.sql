-- Add langsmith_run_id to prompt_runs so parent feedback ratings can be
-- linked back to the LangSmith trace for quality monitoring.
ALTER TABLE public.prompt_runs
  ADD COLUMN langsmith_run_id TEXT;
