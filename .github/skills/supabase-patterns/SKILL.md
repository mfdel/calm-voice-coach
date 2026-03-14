---
name: supabase-patterns
description: RLS policies, edge function auth, and migration patterns for ParentPilot
---

# Supabase Patterns — ParentPilot

## 1. Row Level Security (RLS) — Standard Template

Every new table must include:

```sql
-- Enable RLS
alter table public.<table_name> enable row level security;

-- Users can only see their own rows
create policy "<table_name>: select own rows"
  on public.<table_name> for select
  using (auth.uid() = user_id);

-- Users can only insert their own rows
create policy "<table_name>: insert own rows"
  on public.<table_name> for insert
  with check (auth.uid() = user_id);

-- Users can only update their own rows
create policy "<table_name>: update own rows"
  on public.<table_name> for update
  using (auth.uid() = user_id);

-- Users can only delete their own rows
create policy "<table_name>: delete own rows"
  on public.<table_name> for delete
  using (auth.uid() = user_id);
```

### Child profile ownership pattern
When a table is owned by a child (not directly by auth user):
```sql
create policy "<table_name>: select via child ownership"
  on public.<table_name> for select
  using (
    exists (
      select 1 from public.child_profiles
      where child_profiles.id = <table_name>.child_id
        and child_profiles.user_id = auth.uid()
    )
  );
```

### Read-only shared data (knowledge_snippets, knowledge_articles)
```sql
create policy "<table_name>: public read"
  on public.<table_name> for select
  using (true);
-- No insert/update/delete policies (admin-only via service role)
```

---

## 2. Edge Function Auth — Standard Pattern

Every edge function must validate auth before any DB operation:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export async function handler(req: Request): Promise<Response> {
  // 1. Extract and validate auth token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  // 2. Create anon client to validate user token (uses RLS)
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // 3. Use service role client for privileged operations (e.g., logging)
  const adminClient = createClient(supabaseUrl, supabaseKey);

  // 4. All user-scoped DB queries use userClient (RLS enforced)
  const { data } = await userClient.from('child_profiles').select('*');

  // ...
}
```

**Rules:**
- User data queries → `userClient` (RLS enforced)
- Telemetry/logging inserts → `adminClient` (bypasses RLS intentionally)
- NEVER trust `user_id` from the request body — always use `user.id` from auth

---

## 3. Migration Conventions

```bash
# Create a new migration
npx supabase migration new <snake_case_description>
# e.g.: npx supabase migration new add_calming_phrase_to_child_profiles

# Apply locally
npx supabase db reset

# Never edit existing migration files — always create new ones
```

### Migration file template
```sql
-- Migration: add_calming_phrase_to_child_profiles
-- Date: YYYY-MM-DD

alter table public.child_profiles
  add column if not exists calming_phrase text;

comment on column public.child_profiles.calming_phrase
  is 'A phrase the parent uses to help this child calm down during SOS moments';
```

### Adding an index
```sql
create index if not exists idx_<table>_<column>
  on public.<table>(<column>);
```

---

## 4. Type Generation

After schema changes, regenerate types:
```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Always import types from the generated file:
```typescript
import type { Database } from '@/integrations/supabase/types';
type ChildProfile = Database['public']['Tables']['child_profiles']['Row'];
```
