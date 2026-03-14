# Literature Review Search Scripts

Minimal Python scripts for searching academic databases. Used by the multi-agent literature review system (`.github/agents/literature-review-orchestrator.agent.md`).

## Prerequisites

```bash
pip3 install requests
```

## Scripts

| Script | Database | API Key Required | Description |
|--------|----------|-----------------|-------------|
| `s2_search.py` | Semantic Scholar | Optional (`S2_API_KEY`) | Primary academic search |
| `search_openalex.py` | OpenAlex | Optional (`OPENALEX_EMAIL`) | Broad academic search, free |
| `search_arxiv.py` | arXiv | No | Preprint search |
| `verify_paper.py` | CrossRef | No | Verifies paper existence, retrieves DOI |

## Usage

```bash
# Search Semantic Scholar
python3 -m scripts.lit_review.s2_search --query "transformer architectures" --limit 20

# Search OpenAlex
python3 -m scripts.lit_review.search_openalex --query "machine learning fairness" --limit 20

# Search arXiv
python3 -m scripts.lit_review.search_arxiv --query "large language models" --limit 20

# Verify a paper via CrossRef
python3 -m scripts.lit_review.verify_paper --title "Attention Is All You Need" --authors "Vaswani"
```

## Output Format

All search scripts output a uniform JSON schema:

```json
{
  "status": "ok",
  "source": "semantic_scholar|openalex|arxiv",
  "query": "search terms",
  "count": 15,
  "results": [
    {
      "title": "Paper Title",
      "authors": ["Author One", "Author Two"],
      "year": 2024,
      "abstract": "Paper abstract text...",
      "url": "https://...",
      "doi": "10.xxxx/...",
      "arxiv_id": "2401.12345",
      "citation_count": 42,
      "venue": "Conference/Journal Name",
      "publication_date": "2024-01-15",
      "source": "semantic_scholar"
    }
  ]
}
```

## Environment Variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `S2_API_KEY` or `SEMANTIC_SCHOLAR_API_KEY` | `s2_search.py` | Higher rate limits (optional) |
| `OPENALEX_EMAIL` | `search_openalex.py` | OpenAlex polite pool (optional) |

## Rate Limiting

All scripts include built-in rate limiting and retry logic (up to 3 retries):
- **Semantic Scholar**: 1.1s between requests
- **OpenAlex**: 0.5s between retries
- **arXiv**: 3s between requests (arXiv policy)
- **CrossRef**: 1s between retries
