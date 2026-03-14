#!/usr/bin/env python3
"""CrossRef verification — checks if a paper exists and retrieves its DOI.

Uses the CrossRef API to verify paper metadata against their database.
Outputs structured JSON to stdout.

Usage:
    python3 -m scripts.lit_review.verify_paper --title "Attention Is All You Need" --authors "Vaswani"
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from difflib import SequenceMatcher
from typing import Any
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

API_BASE = "https://api.crossref.org/works"

MAX_RETRIES = 3
_RATE_LIMIT_DELAY = 1.0


def _title_similarity(title_a: str, title_b: str) -> float:
    """Compute similarity ratio between two titles (case-insensitive)."""
    return SequenceMatcher(
        None,
        title_a.lower().strip(),
        title_b.lower().strip(),
    ).ratio()


def _extract_cr_authors(item: dict[str, Any]) -> list[str]:
    """Extract formatted author names from a CrossRef work item."""
    authors: list[str] = []
    for author in item.get("author", []):
        given = author.get("given", "")
        family = author.get("family", "")
        if given and family:
            authors.append(f"{given} {family}")
        elif family:
            authors.append(family)
    return authors


def _extract_pub_date(item: dict[str, Any]) -> str:
    """Extract publication date from a CrossRef work item."""
    for date_field in ("published-print", "published-online"):
        date_parts = item.get(date_field, {}).get("date-parts", [[]])
        if date_parts and date_parts[0]:
            return "-".join(str(p) for p in date_parts[0])
    return ""


def verify_paper(
    title: str,
    authors: str = "",
    threshold: float = 0.85,
) -> dict[str, Any]:
    """Verify a paper exists via CrossRef.

    Args:
        title: Paper title to verify.
        authors: Comma-separated author names (optional, improves matching).
        threshold: Minimum title similarity for a positive match (0.0-1.0).

    Returns:
        Dictionary with verification status, DOI, and match score.
    """
    params: dict[str, str] = {
        "query.title": title,
        "rows": "5",
        "select": "DOI,title,author,published-print,published-online,type,container-title",
    }
    if authors:
        params["query.author"] = authors

    url = f"{API_BASE}?{urlencode(params)}"

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "LitReviewBot/1.0 (academic-verification)",
                },
                timeout=30,
            )

            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                logger.warning("Rate limited. Waiting %ds...", wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()

            items = data.get("message", {}).get("items", [])
            if not items:
                return {
                    "status": "ok",
                    "verified": False,
                    "doi": "",
                    "match_score": 0.0,
                    "message": "No results found in CrossRef",
                }

            best_match = items[0]
            best_titles = best_match.get("title", [])
            best_title_str = best_titles[0] if best_titles else ""
            score = _title_similarity(title, best_title_str)

            return {
                "status": "ok",
                "verified": score >= threshold,
                "doi": best_match.get("DOI", ""),
                "match_score": round(score, 3),
                "matched_title": best_title_str,
                "matched_authors": _extract_cr_authors(best_match),
                "publication_date": _extract_pub_date(best_match),
                "venue": ", ".join(best_match.get("container-title", [])),
                "type": best_match.get("type", ""),
            }

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "verified": False,
                "doi": "",
                "match_score": 0.0,
                "error": "Request timed out after retries",
            }
        except requests.exceptions.RequestException as exc:
            if attempt < MAX_RETRIES - 1:
                time.sleep(_RATE_LIMIT_DELAY)
                continue
            return {
                "status": "error",
                "verified": False,
                "doi": "",
                "match_score": 0.0,
                "error": str(exc),
            }

    return {
        "status": "error",
        "verified": False,
        "doi": "",
        "match_score": 0.0,
        "error": "Max retries exceeded",
    }


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Verify a paper via CrossRef API"
    )
    parser.add_argument(
        "--title", "-t", required=True, help="Paper title to verify"
    )
    parser.add_argument(
        "--authors", "-a", default="", help="Comma-separated author names"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.85,
        help="Minimum title similarity for match (default: 0.85)",
    )
    args = parser.parse_args()

    result = verify_paper(
        title=args.title,
        authors=args.authors,
        threshold=args.threshold,
    )
    sys.stdout.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
