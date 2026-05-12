DROP POLICY IF EXISTS "System inserts suggestions" ON public.incident_suggestions;
DROP POLICY IF EXISTS "System can insert prompt runs" ON public.prompt_runs;
DROP POLICY IF EXISTS "System can insert retrieval events" ON public.retrieval_events;
REVOKE INSERT ON public.incident_suggestions FROM authenticated, anon;
REVOKE INSERT ON public.prompt_runs FROM authenticated, anon;
REVOKE INSERT ON public.retrieval_events FROM authenticated, anon;