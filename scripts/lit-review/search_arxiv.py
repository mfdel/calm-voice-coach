#!/usr/bin/env python3
"""arXiv API search for preprints.

Searches the arXiv API (free, no key required) for papers matching a query.
Parses the Atom XML response and outputs structured JSON to stdout.

Usage:
    python3 -m scripts.lit_review.search_arxiv --query "large language models" --limit 20
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import xml.etree.ElementTree as ET
from typing import Any
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

API_BASE = "http://export.arxiv.org/api/query"

ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"

MAX_RETRIES = 3
_RATE_LIMIT_DELAY = 3.0  # arXiv asks for 3s between requests


def _clean_text(text: str | None) -> str:
    """Clean whitespace from XML text content."""
    if not text:
        return ""
    return " ".join(text.split())


def _extract_year(published: str) -> int | None:
    """Extract year from an ISO date string."""
    if published and len(published) >= 4:
        try:
            return int(published[:4])
        except ValueError:
            return None
    return None


def _extract_pdf_url(entry: ET.Element) -> str:
    """Extract the PDF link from an arXiv Atom entry."""
    for link in entry.findall(f"{ATOM_NS}link"):
        if link.get("title") == "pdf":
            return link.get("href", "")
    return ""


def _parse_entry(entry: ET.Element) -> dict[str, Any]:
    """Parse a single arXiv Atom entry into a structured dict.

    Args:
        entry: An XML Element representing one arXiv entry.

    Returns:
        Dictionary with paper metadata.
    """
    title = _clean_text(entry.findtext(f"{ATOM_NS}title"))
    abstract = _clean_text(entry.findtext(f"{ATOM_NS}summary"))
    published = entry.findtext(f"{ATOM_NS}published", "")

    year = _extract_year(published)

    authors = [
        author_el.findtext(f"{ATOM_NS}name", "Unknown")
        for author_el in entry.findall(f"{ATOM_NS}author")
    ]

    entry_id = entry.findtext(f"{ATOM_NS}id", "")
    arxiv_id = entry_id.split("/abs/")[-1] if "/abs/" in entry_id else ""

    pdf_url = _extract_pdf_url(entry)
    doi = entry.findtext(f"{ARXIV_NS}doi", "")

    primary_cat = entry.find(f"{ARXIV_NS}primary_category")
    category = primary_cat.get("term", "") if primary_cat is not None else ""

    return {
        "title": title,
        "authors": authors,
        "year": year,
        "abstract": abstract,
        "url": entry_id,
        "pdf_url": pdf_url,
        "doi": doi,
        "arxiv_id": arxiv_id,
        "citation_count": None,
        "venue": f"arXiv ({category})" if category else "arXiv",
        "publication_date": published[:10] if published else "",
        "source": "arxiv",
    }


def search_arxiv(
    query: str,
    limit: int = 20,
    start: int = 0,
    sort_by: str = "relevance",
) -> dict[str, Any]:
    """Search arXiv for preprints.

    Args:
        query: Search query (supports arXiv query syntax: all:, ti:, au:, abs:).
        limit: Maximum number of results (1-100).
        start: Start index for pagination.
        sort_by: Sort order — "relevance", "lastUpdatedDate", "submittedDate".

    Returns:
        Dictionary with status, source, query, count, and results list.
    """
    # If query doesn't use arXiv field prefixes, search all fields
    if ":" not in query:
        search_query = f"all:{query}"
    else:
        search_query = query

    params = {
        "search_query": search_query,
        "start": start,
        "max_results": min(limit, 100),
        "sortBy": sort_by,
        "sortOrder": "descending",
    }
    url = f"{API_BASE}?{urlencode(params)}"

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, timeout=30)

            if resp.status_code == 503:
                wait = 2 ** (attempt + 1) + _RATE_LIMIT_DELAY
                logger.warning("arXiv unavailable. Waiting %ds...", wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()

            root = ET.fromstring(resp.text)
            results = [_parse_entry(e) for e in root.findall(f"{ATOM_NS}entry")]

            return {
                "status": "ok",
                "source": "arxiv",
                "query": query,
                "count": len(results),
                "results": results,
            }

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "source": "arxiv",
                "query": query,
                "count": 0,
                "error": "Request timed out after retries",
                "results": [],
            }
        except (requests.exceptions.RequestException, ET.ParseError) as exc:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "source": "arxiv",
                "query": query,
                "count": 0,
                "error": str(exc),
                "results": [],
            }

    return {
        "status": "error",
        "source": "arxiv",
        "query": query,
        "count": 0,
        "error": "Max retries exceeded",
        "results": [],
    }


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Search arXiv API for preprints")
    parser.add_argument(
        "--query", "-q", required=True, help="Search query string"
    )
    parser.add_argument(
        "--limit", "-l", type=int, default=20, help="Max results (default: 20)"
    )
    parser.add_argument(
        "--start", type=int, default=0, help="Start index for pagination"
    )
    parser.add_argument(
        "--sort",
        choices=["relevance", "lastUpdatedDate", "submittedDate"],
        default="relevance",
        help="Sort order (default: relevance)",
    )
    args = parser.parse_args()

    result = search_arxiv(
        query=args.query, limit=args.limit, start=args.start, sort_by=args.sort
    )
    sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
