#!/usr/bin/env python3
"""Semantic Scholar Academic Graph API search.

Searches the Semantic Scholar API for academic papers matching a query string.
Outputs structured JSON to stdout.

Usage:
    python3 -m scripts.lit_review.s2_search --query "transformer architectures" --limit 20

Environment variables:
    S2_API_KEY  (optional) — Semantic Scholar API key for higher rate limits.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from typing import Any
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

API_BASE = "https://api.semanticscholar.org/graph/v1/paper/search"

DEFAULT_FIELDS = (
    "title,authors,year,abstract,url,citationCount,externalIds,venue,publicationDate"
)

# Rate-limit: max 1 req/sec without key, 10 req/sec with key
_RATE_LIMIT_DELAY = 1.1  # seconds between requests (safe default)
MAX_RETRIES = 3


def _build_headers() -> dict[str, str]:
    """Build request headers, adding API key if available."""
    headers: dict[str, str] = {"Accept": "application/json"}
    api_key = os.environ.get("S2_API_KEY") or os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
    return headers


def search_semantic_scholar(
    query: str,
    limit: int = 20,
    fields: str = DEFAULT_FIELDS,
    offset: int = 0,
) -> dict[str, Any]:
    """Search Semantic Scholar and return structured results.

    Args:
        query: Search query string.
        limit: Maximum number of results (1-100).
        fields: Comma-separated API fields to retrieve.
        offset: Pagination offset.

    Returns:
        Dictionary with status, source, query, count, and results list.
    """
    params = {
        "query": query,
        "limit": min(limit, 100),
        "offset": offset,
        "fields": fields,
    }
    url = f"{API_BASE}?{urlencode(params)}"
    headers = _build_headers()

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=headers, timeout=30)

            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                logger.warning("Rate limited. Waiting %ds...", wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()

            results = []
            for paper in data.get("data", []):
                authors = [
                    a.get("name", "Unknown")
                    for a in (paper.get("authors") or [])
                ]
                external_ids = paper.get("externalIds") or {}
                doi = external_ids.get("DOI", "")
                arxiv_id = external_ids.get("ArXiv", "")

                results.append(
                    {
                        "title": paper.get("title", ""),
                        "authors": authors,
                        "year": paper.get("year"),
                        "abstract": paper.get("abstract", ""),
                        "url": paper.get("url", ""),
                        "doi": doi,
                        "arxiv_id": arxiv_id,
                        "citation_count": paper.get("citationCount", 0),
                        "venue": paper.get("venue", ""),
                        "publication_date": paper.get("publicationDate", ""),
                        "source": "semantic_scholar",
                    }
                )

            return {
                "status": "ok",
                "source": "semantic_scholar",
                "query": query,
                "count": len(results),
                "total": data.get("total", len(results)),
                "results": results,
            }

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "source": "semantic_scholar",
                "query": query,
                "count": 0,
                "error": "Request timed out after retries",
                "results": [],
            }
        except requests.exceptions.RequestException as exc:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "source": "semantic_scholar",
                "query": query,
                "count": 0,
                "error": str(exc),
                "results": [],
            }

    return {
        "status": "error",
        "source": "semantic_scholar",
        "query": query,
        "count": 0,
        "error": "Max retries exceeded",
        "results": [],
    }


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Search Semantic Scholar Academic Graph API"
    )
    parser.add_argument(
        "--query", "-q", required=True, help="Search query string"
    )
    parser.add_argument(
        "--limit", "-l", type=int, default=20, help="Max results (default: 20)"
    )
    parser.add_argument(
        "--fields",
        "-f",
        default=DEFAULT_FIELDS,
        help="Comma-separated fields to retrieve",
    )
    parser.add_argument(
        "--offset", type=int, default=0, help="Pagination offset"
    )
    args = parser.parse_args()

    result = search_semantic_scholar(
        query=args.query,
        limit=args.limit,
        fields=args.fields,
        offset=args.offset,
    )
    sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
