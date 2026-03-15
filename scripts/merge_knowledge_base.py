"""
Merge existing Supabase knowledge-base exports with new literature-review-sourced
articles and snippets.

Existing files (semicolon-delimited, read-only):
  /Users/fuat.deligoz/Downloads/knowledge_articles-export-2026-03-14_17-18-53.csv
  /Users/fuat.deligoz/Downloads/knowledge_snippets-export-2026-03-14_17-19-02.csv

New content files (pipe-delimited, produced from literature review):
  docs/kb-articles.psv
  docs/kb-snippets.psv

Output (semicolon-delimited, matching existing schema exactly):
  docs/knowledge_articles_combined.csv
  docs/knowledge_snippets_combined.csv
"""

import csv
import uuid
from pathlib import Path
from datetime import datetime, timezone

REPO = Path(__file__).parent.parent
DOWNLOADS = Path("/Users/fuat.deligoz/Downloads")
NOW = "2026-03-15 00:00:00+00"

# ── helpers ───────────────────────────────────────────────────────────────────

def read_semicolon_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter=";"))

def read_pipe_csv(path, n_cols: int):
    """
    Pipe-delimited reader that splits each line into at most n_cols fields,
    so pipe characters inside the LAST field (e.g. source_notes citations)
    don't corrupt parsing.
    """
    rows = []
    with open(path, encoding="utf-8") as f:
        lines = [l.rstrip("\n") for l in f if l.strip()]
    # First non-empty line is the header
    header = [h.strip() for h in lines[0].split("|", n_cols - 1)]
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("|", n_cols - 1)
        # Pad short rows
        while len(parts) < n_cols:
            parts.append("")
        row = {header[i]: parts[i].strip() for i in range(n_cols)}
        rows.append(row)
    return rows

def write_semicolon_csv(path, fieldnames, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            delimiter=";",
            quoting=csv.QUOTE_MINIMAL,
            extrasaction="ignore",
        )
        w.writeheader()
        w.writerows(rows)
    print(f"  Written: {path}  ({len(rows)} data rows)")

def article_id(n: int) -> str:
    """Sequential ID continuing from the existing 15 articles."""
    return f"a0000001-0000-0000-0000-{n:012d}"

def snippet_id(n: int) -> str:
    """Sequential ID for new snippets using 'b' prefix."""
    return f"b0000001-0000-0000-0000-{n:012d}"

def normalise_json_array(raw: str) -> str:
    """
    Return a value that csv.writer will render as  "[""x"",""y""]"
    when embedded in a semicolon-delimited file.
    The raw value coming from the PSV already looks like  ["x","y"]  or  []
    We just clean whitespace and return it as-is; csv.writer handles quoting.
    """
    return raw.strip()

# ── load existing data ────────────────────────────────────────────────────────

existing_articles = read_semicolon_csv(
    DOWNLOADS / "knowledge_articles-export-2026-03-14_17-18-53.csv"
)
existing_snippets = read_semicolon_csv(
    DOWNLOADS / "knowledge_snippets-export-2026-03-14_17-19-02.csv"
)

existing_article_ids = {r["id"] for r in existing_articles}
existing_snippet_ids = {r["id"] for r in existing_snippets}

print(f"Existing articles : {len(existing_articles)}")
print(f"Existing snippets : {len(existing_snippets)}")

# ── load new content ──────────────────────────────────────────────────────────

new_articles_raw = read_pipe_csv(REPO / "docs" / "kb-articles.psv", n_cols=5)
new_snippets_raw = read_pipe_csv(REPO / "docs" / "kb-snippets.psv", n_cols=9)

# No post-read strip needed — already done by the custom reader


print(f"New articles (PSV): {len(new_articles_raw)}")
print(f"New snippets (PSV): {len(new_snippets_raw)}")

# ── assign IDs to new articles ────────────────────────────────────────────────
# Existing articles occupy IDs 1-15; new ones start at 16.

ARTICLE_COLS = ["id", "problem_category", "title", "age_groups",
                "description", "editorial_status", "source_notes", "updated_at"]

new_articles = []
title_to_id: dict[str, str] = {}

for i, raw in enumerate(new_articles_raw, start=16):
    aid = article_id(i)
    title_to_id[raw["title"]] = aid
    new_articles.append({
        "id": aid,
        "problem_category": raw["problem_category"].strip("`"),   # strip backticks if any
        "title": raw["title"],
        "age_groups": normalise_json_array(raw["age_groups"].strip("`")),
        "description": raw["description"],
        "editorial_status": "draft",
        "source_notes": raw["source_notes"],
        "updated_at": NOW,
    })

print(f"\nNew article IDs assigned: {list(title_to_id.values())[:3]} …")

# ── assign IDs to new snippets ────────────────────────────────────────────────

SNIPPET_COLS = ["id", "article_id", "snippet_type", "title", "content",
                "applicable_triggers", "blocked_by_red_lines", "success_signals",
                "weight", "embedding", "updated_at"]

new_snippets = []
unmatched_titles: set[str] = set()

for i, raw in enumerate(new_snippets_raw, start=1):
    art_title = raw["article_title"]
    aid = title_to_id.get(art_title)
    if aid is None:
        unmatched_titles.add(art_title)
        aid = "UNKNOWN"

    new_snippets.append({
        "id": snippet_id(i),
        "article_id": aid,
        "snippet_type": raw["snippet_type"],
        "title": raw["title"],
        "content": raw["content"],
        "applicable_triggers": normalise_json_array(raw["applicable_triggers"].strip("`")),
        "blocked_by_red_lines": normalise_json_array(raw["blocked_by_red_lines"].strip("`")),
        "success_signals": normalise_json_array(raw["success_signals"].strip("`")),
        "weight": raw["weight"],
        "embedding": "",
        "updated_at": NOW,
    })

if unmatched_titles:
    print(f"\n⚠  Unmatched article titles in snippets ({len(unmatched_titles)}):")
    for t in sorted(unmatched_titles):
        print(f"    {t!r}")
else:
    print("All snippet article_titles matched successfully.")

# ── combine & write ───────────────────────────────────────────────────────────

combined_articles = existing_articles + new_articles
combined_snippets = existing_snippets + new_snippets

print(f"\nCombined articles : {len(combined_articles)} ({len(existing_articles)} existing + {len(new_articles)} new)")
print(f"Combined snippets : {len(combined_snippets)} ({len(existing_snippets)} existing + {len(new_snippets)} new)")

out_dir = REPO / "docs"
write_semicolon_csv(out_dir / "knowledge_articles_combined.csv", ARTICLE_COLS, combined_articles)
write_semicolon_csv(out_dir / "knowledge_snippets_combined.csv", SNIPPET_COLS, combined_snippets)

# ── spot-check ────────────────────────────────────────────────────────────────

print("\n── Article ID range ──────────────────────────────────────────────────────")
all_ids = [r["id"] for r in combined_articles]
print(f"  First: {all_ids[0]}")
print(f"  Last : {all_ids[-1]}")
print(f"  Total unique IDs: {len(set(all_ids))}")

print("\n── Snippet → article linkage sample ─────────────────────────────────────")
for s in combined_snippets[:3]:
    print(f"  {s['id']}  →  {s['article_id']}  [{s['snippet_type']}] {s['title'][:50]}")
for s in combined_snippets[-3:]:
    print(f"  {s['id']}  →  {s['article_id']}  [{s['snippet_type']}] {s['title'][:50]}")

print("\n── Snippet types in new batch ────────────────────────────────────────────")
from collections import Counter
type_counts = Counter(s["snippet_type"] for s in new_snippets)
for k, v in sorted(type_counts.items()):
    print(f"  {k:15s}: {v}")

print("\n✓ Done.")
