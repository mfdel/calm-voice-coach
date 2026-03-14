create table child_history_summaries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references child_profiles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  generated_at timestamptz default now() not null,
  summary_text text not null,
  window_days int not null default 30
);

alter table child_history_summaries enable row level security;

create policy "owner access" on child_history_summaries
  for all using (auth.uid() = user_id);

create index idx_child_history_child_generated
  on child_history_summaries(child_id, generated_at desc);