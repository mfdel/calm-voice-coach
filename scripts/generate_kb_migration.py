#!/usr/bin/env python3
"""
Generates supabase/migrations/20260314200000_seed_knowledge_base.sql
from docs/kb-articles.psv and docs/kb-snippets.psv

Run: python3 scripts/generate_kb_migration.py
Then: npx supabase db push  (after supabase login)
"""
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent


def sql_str(s: str) -> str:
    return s.replace("'", "''")


def main():
    articles_path = ROOT / "docs" / "kb-articles.psv"
    snippets_path = ROOT / "docs" / "kb-snippets.psv"
    out_path = ROOT / "supabase" / "migrations" / "20260314200000_seed_knowledge_base.sql"

    ARTICLE_COLS = ["problem_category", "title", "age_groups", "description", "source_notes"]
    articles = []
    with open(articles_path, encoding="utf-8") as f:
        next(f)
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            parts = line.split("|", maxsplit=4)
            if len(parts) == len(ARTICLE_COLS):
                articles.append(dict(zip(ARTICLE_COLS, [p.strip() for p in parts])))

    SNIPPET_COLS = [
        "article_title", "problem_category", "snippet_type", "title",
        "content", "applicable_triggers", "blocked_by_red_lines", "success_signals", "weight",
    ]
    snippets = []
    with open(snippets_path, encoding="utf-8") as f:
        next(f)
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            parts = line.split("|", maxsplit=8)
            if len(parts) == len(SNIPPET_COLS):
                snippets.append(dict(zip(SNIPPET_COLS, [p.strip() for p in parts])))

    print(f"Loaded {len(articles)} articles, {len(snippets)} snippets")

    lines = []
    lines += [
        "-- Seed: Knowledge Base articles and snippets",
        "-- Source: Evidence-Based Parenting Strategies Literature Review (March 2026)",
        "-- Generated from: docs/kb-articles.psv + docs/kb-snippets.psv",
        "-- Idempotent: skips if bedtime_resistance articles already exist",
        "",
        "DO $seed$",
        "BEGIN",
        "IF NOT EXISTS (",
        "  SELECT 1 FROM public.knowledge_articles",
        "  WHERE problem_category = 'bedtime_resistance'",
        ") THEN",
        "",
        "-- ================================================================",
        "-- ARTICLES",
        "-- ================================================================",
        "INSERT INTO public.knowledge_articles",
        "  (problem_category, title, age_groups, description, editorial_status, source_notes)",
        "VALUES",
    ]

    article_value_rows = []
    for a in articles:
        article_value_rows.append(
            "  ("
            + f"'{sql_str(a['problem_category'])}',"
            + f" '{sql_str(a['title'])}',"
            + f" '{a['age_groups']}'::jsonb,"
            + f" '{sql_str(a['description'])}',"
            + f" 'draft',"
            + f" '{sql_str(a['source_notes'])}'"
            + ")"
        )

    lines.append(",\n".join(article_value_rows) + ";")
    lines.append("")
    lines.append("-- ================================================================")
    lines.append("-- SNIPPETS")
    lines.append("-- ================================================================")

    by_article: dict = defaultdict(list)
    for s in snippets:
        by_article[s["article_title"]].append(s)

    for article_title, snips in by_article.items():
        lines.append(f"-- {article_title}")
        lines.append(
            "INSERT INTO public.knowledge_snippets"
            " (article_id, snippet_type, title, content,"
            " applicable_triggers, blocked_by_red_lines, success_signals, weight)"
        )
        union_parts = []
        for s in snips:
            union_parts.append(
                "  SELECT a.id,"
                f" '{sql_str(s['snippet_type'])}',"
                f" '{sql_str(s['title'])}',"
                f" '{sql_str(s['content'])}',"
                f" '{s['applicable_triggers']}'::jsonb,"
                f" '{s['blocked_by_red_lines']}'::jsonb,"
                f" '{s['success_signals']}'::jsonb,"
                f" {s['weight']}::real"
                f"\n  FROM public.knowledge_articles a WHERE a.title = '{sql_str(article_title)}'"
            )
        lines.append("\nUNION ALL\n".join(union_parts) + ";")
        lines.append("")

    lines += [
        "END IF;",
        "END",
        "$seed$;",
    ]

    sql_content = "\n".join(lines)
    out_path.write_text(sql_content, encoding="utf-8")
    print(f"Written {len(sql_content):,} bytes -> {out_path.relative_to(ROOT)}")
    print(f"Lines: {sql_content.count(chr(10))}")


if __name__ == "__main__":
    main()
