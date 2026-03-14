# Literature Review Skill

## Overview

Multi-agent literature review system that produces comprehensive, analytically rigorous academic literature reviews on any research topic. The system coordinates 4 specialist agents through a 6-phase workflow, searching real academic databases and producing reviews grounded entirely in verified citations.

## Architecture

| Agent | Role | Invocations |
|-------|------|-------------|
| **`literature-review-orchestrator`** | Coordinates the 6-phase workflow, dispatches subagents, assembles final output | 1 per review |
| **`lit-review-planner`** | Decomposes topic into 3-8 focused research domains with search strategies | 1 per review |
| **`lit-review-researcher`** | Searches academic databases for one domain, produces annotated bibliography | 1 per domain (3-8 per review) |
| **`lit-review-synthesis-planner`** | Designs narrative structure organized by theme/insight, not by domain | 1 per review |
| **`lit-review-writer`** | Writes one analytical section with proper citations | 1 per section (4-9 per review) |

## Workflow Phases

### Phase 1: Verify Environment
- Check that search scripts exist in `scripts/lit-review/`
- Create working directory `reviews/<topic-slug>/`
- Initialize progress tracking file

### Phase 2: Plan
- Dispatch `lit-review-planner` to decompose the topic
- Produces `lit-review-plan.md` with 3-8 domains, search terms, key questions

### Phase 3: Research (Parallel)
- Dispatch one `lit-review-researcher` per domain — all launched simultaneously
- Each searches Semantic Scholar, OpenAlex, arXiv
- Produces `literature-domain-N.md` bibliography files
- Deduplicates across sources

### Phase 4: Outline
- Dispatch `lit-review-synthesis-planner` to design narrative structure
- Reads all bibliography files, identifies themes and connections
- Produces `synthesis-outline.md` with per-section plans

### Phase 5: Write (Parallel)
- Dispatch one `lit-review-writer` per section — all launched simultaneously
- Each reads outline + relevant bibliography files
- Produces `synthesis-section-N.md` files

### Phase 6: Assemble
- Orchestrator combines all section files into `literature-review-final.md`
- Adds title, metadata, and compiled references section
- Updates progress tracking

## File Conventions

All files are written to `reviews/<topic-slug>/`:

| File | Created By | Phase |
|------|-----------|-------|
| `task-progress.md` | Orchestrator | 1-6 (updated throughout) |
| `lit-review-plan.md` | Planner | 2 |
| `literature-domain-1.md` through `literature-domain-N.md` | Researchers | 3 |
| `synthesis-outline.md` | Synthesis Planner | 4 |
| `synthesis-section-0.md` through `synthesis-section-N.md` | Writers | 5 |
| `literature-review-final.md` | Orchestrator | 6 |

## Academic Database APIs

### Semantic Scholar (Primary)
- **Script**: `scripts/lit-review/s2_search.py`
- **API**: `https://api.semanticscholar.org/graph/v1/paper/search`
- **Auth**: Optional `S2_API_KEY` or `SEMANTIC_SCHOLAR_API_KEY` env var (higher rate limits)
- **Coverage**: Broad academic coverage, strong on CS, biomedicine, physics
- **Rate limit**: 1 req/sec without key, 10 req/sec with key

### OpenAlex (Broad)
- **Script**: `scripts/lit-review/search_openalex.py`
- **API**: `https://api.openalex.org/works`
- **Auth**: Optional `OPENALEX_EMAIL` for polite pool
- **Coverage**: Very broad, 250M+ works, good for older and non-CS papers
- **Rate limit**: Generous, ~10 req/sec in polite pool

### arXiv (Preprints)
- **Script**: `scripts/lit-review/search_arxiv.py`
- **API**: `http://export.arxiv.org/api/query`
- **Auth**: None required
- **Coverage**: CS, physics, math, quantitative biology/finance, economics
- **Rate limit**: 3s between requests (arXiv policy)

### CrossRef (Verification)
- **Script**: `scripts/lit-review/verify_paper.py`
- **API**: `https://api.crossref.org/works`
- **Auth**: None required
- **Purpose**: Verify paper existence, retrieve DOIs, check metadata accuracy

## Running Scripts

```bash
# All scripts use python3 — ensure requests is installed: pip3 install requests
python3 -m scripts.lit_review.s2_search --query "search terms" --limit 20
python3 -m scripts.lit_review.search_openalex --query "search terms" --limit 20
python3 -m scripts.lit_review.search_arxiv --query "search terms" --limit 20
python3 -m scripts.lit_review.verify_paper --title "Paper Title" --authors "Author"
```

## Citation Integrity Rules

These are the most important rules in the entire system:

1. **NEVER fabricate papers** — every citation must trace to an API response
2. **NEVER invent authors, DOIs, years, or abstracts** — all metadata from API output
3. **NEVER introduce papers not found during research** — writers can only cite what researchers found
4. **Verify via CrossRef when possible** — especially for high-impact claims
5. **Report gaps honestly** — if evidence is thin, say so instead of stretching
6. **Use Author-Date citation format** — consistent throughout ("Smith et al., 2023")

## Invoking the System

### Via Slash Command
```
/literature-review <topic description>
```

### Via Agent Mention
```
@literature-review-orchestrator Conduct a literature review on <topic>
```

## Target Output
- **Length**: 3000-5000 words
- **Sections**: 4-9 (introduction, 3-7 body sections, conclusion)
- **Papers cited**: 40-100 (typically)
- **Tone**: Analytical academic prose — no paper-by-paper summaries
