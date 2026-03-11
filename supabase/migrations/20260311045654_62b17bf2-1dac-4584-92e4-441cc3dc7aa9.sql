
CREATE TABLE public.curated_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_curated_categories_user_child ON public.curated_categories(user_id, child_id);

ALTER TABLE public.curated_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own curated categories"
  ON public.curated_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
