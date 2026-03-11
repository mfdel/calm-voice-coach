# ParentPilot v1 Data Model and Database Schema

## Overview

This schema supports a **single-user, privacy-conscious v1** with:
- child-specific context
- parenting preferences + red lines
- SOS incidents and feedback
- curated knowledge-base retrieval
- prompt / response observability without storing unnecessary sensitive content

## Storage strategy

### On-device (encrypted local store)
Use `SwiftData` or encrypted `SQLite` for:
- child profile
- parenting preferences
- red lines
- recent incidents cache
- nightly debrief feedback pending sync
- optional temporary voice transcript cache

### Backend (`PostgreSQL` + `pgvector`)
Use for:
- account metadata
- curated parenting knowledge base
- retrieval snippets / embeddings
- normalized incident history
- feedback
- prompt run metadata
- aggregate product analytics

## Entities

## 1. `accounts`
Minimal parent account record.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | account id |
| `email` | TEXT UNIQUE | optional if auth requires it |
| `created_at` | TIMESTAMP | |
| `locale` | TEXT | e.g. `en-US` |
| `timezone` | TEXT | used for nightly debrief timing |
| `llm_provider` | TEXT | provider selection metadata |

## 2. `child_profiles`
One family can start with one child in v1, but schema can support multiple.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK | |
| `display_name` | TEXT | encrypted locally; optional redaction in backend |
| `birth_date` | DATE | |
| `age_group` | TEXT | `toddler`, `preschool`, `school_age` |
| `known_triggers` | JSONB | e.g. `["transitions", "hunger"]` |
| `calming_preferences` | JSONB | e.g. `["quiet_voice", "choices"]` |
| `development_notes` | TEXT | optional |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

## 3. `parenting_preferences`
Top-level family style and values.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK | one active record per account |
| `style` | TEXT | e.g. `gentle`, `structured`, `balanced` |
| `values` | JSONB | e.g. `["connection", "clear_boundaries"]` |
| `tone_preferences` | JSONB | e.g. `["calm", "direct"]` |
| `household_notes` | TEXT | optional additional context |
| `updated_at` | TIMESTAMP | |

## 4. `red_lines`
Hard constraints and strong preferences.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK | |
| `code` | TEXT | e.g. `cry_it_out`, `physical_punishment` |
| `severity` | TEXT | `hard_stop` or `avoid_if_possible` |
| `label` | TEXT | human-readable label |
| `notes` | TEXT | optional |
| `created_at` | TIMESTAMP | |

## 5. `incidents`
Each SOS session.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK | |
| `child_id` | UUID FK | |
| `problem_category` | TEXT | canonical taxonomy value |
| `note_text` | TEXT | parent-provided typed or transcribed note |
| `input_mode` | TEXT | `picker_only`, `text`, `voice`, `voice_plus_text` |
| `context_signals` | JSONB | extracted signals like `fatigue`, `transition` |
| `summary_text` | TEXT | final response summary shown to parent |
| `used_fallback` | BOOLEAN | |
| `latency_ms` | INTEGER | end-to-end backend latency |
| `created_at` | TIMESTAMP | |

## 6. `incident_suggestions`
Normalized response suggestions per incident.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `incident_id` | UUID FK | |
| `position` | INTEGER | display order |
| `title` | TEXT | |
| `reason` | TEXT | short explanation |
| `script` | TEXT | exact suggested language |
| `source_type` | TEXT | `llm`, `fallback`, `kb_direct` |
| `created_at` | TIMESTAMP | |

## 7. `incident_feedback`
Nightly debrief outcomes.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `incident_id` | UUID FK | |
| `outcome` | TEXT | `helpful`, `partly_helpful`, `misaligned`, `did_not_use` |
| `reason_tags` | JSONB | e.g. `["too_generic", "worked_fast"]` |
| `feedback_note` | TEXT | optional |
| `created_at` | TIMESTAMP | |

## 8. `knowledge_articles`
Canonical curated problem entries.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `problem_category` | TEXT | canonical taxonomy key |
| `title` | TEXT | |
| `age_groups` | JSONB | supported age groups |
| `description` | TEXT | short explanation of the problem |
| `editorial_status` | TEXT | `draft`, `reviewed`, `published` |
| `source_notes` | TEXT | optional provenance |
| `updated_at` | TIMESTAMP | |

## 9. `knowledge_snippets`
Retrieval-ready KB chunks.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `article_id` | UUID FK | |
| `snippet_type` | TEXT | `strategy`, `script`, `warning`, `explanation` |
| `title` | TEXT | |
| `content` | TEXT | chunk text used in retrieval |
| `applicable_triggers` | JSONB | e.g. `["fatigue", "transition"]` |
| `blocked_by_red_lines` | JSONB | incompatible red-line codes |
| `success_signals` | JSONB | e.g. `["calms_quickly", "accepts_choice"]` |
| `embedding` | VECTOR | semantic retrieval vector |
| `updated_at` | TIMESTAMP | |

## 10. `retrieval_events`
Traceability for what was retrieved.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `incident_id` | UUID FK | |
| `query_text` | TEXT | normalized query |
| `query_filters` | JSONB | age group, problem category, triggers |
| `top_results` | JSONB | snippet ids + scores |
| `retrieval_ms` | INTEGER | |
| `created_at` | TIMESTAMP | |

## 11. `prompt_runs`
Observability without logging full private prompts indefinitely.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `incident_id` | UUID FK | |
| `prompt_version` | TEXT | |
| `model_name` | TEXT | |
| `input_token_estimate` | INTEGER | |
| `output_token_count` | INTEGER | |
| `response_valid` | BOOLEAN | |
| `retry_count` | INTEGER | |
| `red_line_violation_detected` | BOOLEAN | |
| `created_at` | TIMESTAMP | |

## 12. `voice_transcripts` (optional temp table)
Short-lived transcription cache.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `incident_id` | UUID FK | |
| `transcript_text` | TEXT | temp storage only |
| `transcription_source` | TEXT | `device` only |
| `expires_at` | TIMESTAMP | cleanup target |

## Relationships

```text
accounts
  ├── child_profiles
  ├── parenting_preferences
  ├── red_lines
  └── incidents
        ├── incident_suggestions
        ├── incident_feedback
        ├── retrieval_events
        ├── prompt_runs
        └── voice_transcripts

knowledge_articles
  └── knowledge_snippets
```

## Recommended storage boundaries

### Keep primarily on device
- child display name
- detailed development notes
- full recent incident cache
- temporary transcripts

### Store on backend
- normalized incidents used for retrieval
- knowledge base
- snippet embeddings
- feedback summaries
- prompt metadata

### Do not store long term
- raw voice audio
- full unredacted prompt payloads unless explicitly needed for short-lived debugging

### Voice privacy rule
- Audio is never sent to a transcription endpoint in v1.
- If device transcription fails, the app warns the user and falls back to text-only note entry.

## Indexing strategy

### PostgreSQL indexes

```sql
create index idx_incidents_account_created_at
  on incidents (account_id, created_at desc);

create index idx_incidents_problem_category
  on incidents (problem_category);

create index idx_feedback_incident_id
  on incident_feedback (incident_id);

create index idx_kb_articles_problem_category
  on knowledge_articles (problem_category);

create index idx_kb_snippets_article_id
  on knowledge_snippets (article_id);

create index idx_kb_snippets_embedding
  on knowledge_snippets using ivfflat (embedding vector_cosine_ops);
```

### Retrieval ranking inputs
Rank using a weighted mix of:
- exact problem-category match
- age-group compatibility
- trigger overlap
- red-line compatibility
- prior positive feedback for similar incidents

## Sample records

### Sample 1: `child_profiles`

```json
{
  "id": "child_001",
  "account_id": "acct_001",
  "display_name": "Maya",
  "birth_date": "2023-08-14",
  "age_group": "toddler",
  "known_triggers": ["transitions", "fatigue", "hunger"],
  "calming_preferences": ["choices", "quiet_voice", "hug_if_invited"],
  "development_notes": "Strong-willed when tired"
}
```

### Sample 2: `knowledge_snippets`

```json
{
  "id": "ks_014",
  "article_id": "ka_bedtime_01",
  "snippet_type": "strategy",
  "title": "Offer one bounded choice",
  "content": "When bedtime becomes a power struggle, reduce language and offer one simple choice that still moves the routine forward.",
  "applicable_triggers": ["transition", "fatigue"],
  "blocked_by_red_lines": [],
  "success_signals": ["accepts_choice", "reduced_arguing"]
}
```

### Sample 3: `incidents`

```json
{
  "id": "inc_101",
  "account_id": "acct_001",
  "child_id": "child_001",
  "problem_category": "bedtime_resistance",
  "note_text": "Skipped nap and screaming about pajamas.",
  "input_mode": "voice_plus_text",
  "context_signals": ["fatigue", "transition"],
  "summary_text": "She is overtired and needs a simpler transition.",
  "used_fallback": false,
  "latency_ms": 2430,
  "created_at": "2026-03-11T19:42:10Z"
}
```

## Implementation notes

- Start with a clean canonical taxonomy for the 25-30 problem categories
- Keep `red_lines.code` from a controlled enum list where possible
- Normalize incident feedback into structured tags early; it becomes ranking fuel later
- Add retention policies before production so transcripts and stale metadata do not linger forever
- Do not over-model village sync yet; keep schema v1 single-user-first
