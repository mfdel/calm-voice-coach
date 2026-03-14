#!/usr/bin/env python3
"""OpenAlex API search for academic papers.

Searches the OpenAlex API (free, no key required) for works matching a query.
Outputs structured JSON to stdout.

Usage:
    python3 -m scripts.lit_review.search_openalex --query "machine learning fairness" --limit 20

Environment variables:
    OPENALEX_EMAIL  (optional) — Email for the OpenAlex polite pool (faster responses).
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from typing import Any
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

API_BASE = "https://api.openalex.org/works"

MAX_RETRIES = 3
_RATE_LIMIT_DELAY = 0.5  # OpenAlex is generous but be polite


def _strip_html(text: str) -> str:
    """Remove HTML tags from abstract inverted index reconstruction."""
    return re.sub(r"<[^>]+>", "", text)


def _reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str:
    """Reconstruct abstract text from OpenAlex inverted index format.

    Args:
        inverted_index: Mapping of word -> list of positions.

    Returns:
        Reconstructed plain-text abstract.
    """
    if not inverted_index:
        return ""
    # Build position -> word mapping
    position_map: dict[int, str] = {}
    for word, positions in inverted_index.items():
        for pos in positions:
            position_map[pos] = word
    # Sort by position and join
    sorted_words = [position_map[i] for i in sorted(position_map.keys())]
    return _strip_html(" ".join(sorted_words))


def search_openalex(
    query: str,
    limit: int = 20,
) -> dict[str, Any]:
    """Search OpenAlex for academic works.

    Args:
        query: Search query string.
        limit: Maximum number of results (1-200).

    Returns:
        Dictionary with status, source, query, count, and results list.
    """
    params: dict[str, Any] = {
        "search": query,
        "per_page": min(limit, 200),
    }

    email = os.environ.get("OPENALEX_EMAIL")
    if email:
        params["mailto"] = email

    url = f"{API_BASE}?{urlencode(params)}"

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                url,
                headers={"Accept": "application/json"},
                timeout=30,
            )

            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                logger.warning("Rate limited. Waiting %ds...", wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()

            results = []
            for work in data.get("results", []):
                # Extract authors
                authors = []
                for authorship in work.get("authorships", []):
                    author_info = authorship.get("author", {})
                    name = author_info.get("display_name", "Unknown")
                    authors.append(name)

                # Extract DOI
                doi_raw = work.get("doi", "") or ""
                doi = doi_raw.replace("https://doi.org/", "") if doi_raw else ""

                # Reconstruct abstract
                abstract = _reconstruct_abstract(
                    work.get("abstract_inverted_index")
                )

                # Get best URL
                primary_url = work.get("primary_location", {}) or {}
                landing_page = (
                    primary_url.get("landing_page_url", "")
                    or work.get("id", "")
                )

                results.append(
                    {
                        "title": work.get("display_name", work.get("title", "")),
                        "authors": authors,
                        "year": work.get("publication_year"),
                        "abstract": abstract,
                        "url": landing_page,
                        "doi": doi,
                        "arxiv_id": "",
                        "citation_count": work.get("cited_by_count", 0),
                        "venue": (
                            (work.get("primary_location", {}) or {})
                            .get("source", {}) or {}
                        ).get("display_name", ""),
                        "publication_date": work.get("publication_date", ""),
                        "source": "openalex",
                    }
                )

            return {
                "status": "ok",
                "source": "openalex",
                "query": query,
                "count": len(results),
                "total": data.get("meta", {}).get("count", len(results)),
                "results": results,
            }

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "source": "openalex",
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
                "source": "openalex",
                "query": query,
                "count": 0,
                "error": str(exc),
                "results": [],
            }

    return {
        "status": "error",
        "source": "openalex",
        "query": query,
        "count": 0,
        "error": "Max retries exceeded",
        "results": [],
    }


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Search OpenAlex API for academic works")
    parser.add_argument(
        "--query", "-q", required=True, help="Search query string"
    )
    parser.add_argument(
        "--limit", "-l", type=int, default=20, help="Max results (default: 20)"
    )
    args = parser.parse_args()

    result = search_openalex(query=args.query, limit=args.limit)
    sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
