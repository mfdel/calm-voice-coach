"""
Generate a Supabase SQL migration file to reseed knowledge_articles and knowledge_snippets
from the combined CSV exports.

Usage:
    python3 scripts/generate_reseed_migration.py
"""

import csv
import os

ARTICLES_CSV = os.path.join(os.path.dirname(__file__), "../docs/knowledge_articles_combined.csv")
SNIPPETS_CSV = os.path.join(os.path.dirname(__file__), "../docs/knowledge_snippets_combined.csv")
OUTPUT_SQL = os.path.join(
    os.path.dirname(__file__),
    "../supabase/migrations/20260315000000_reseed_knowledge_base.sql",
)

# Columns that must never be NULL even when blank in the CSV
NON_NULLABLE = {"id", "title", "content", "problem_category", "article_id", "snippet_type"}

# Columns whose values are JSONB arrays
JSONB_COLS = {"age_groups", "applicable_triggers", "blocked_by_red_lines", "success_signals"}

# Skip this column entirely
SKIP_COLS = {"embedding"}


def sql_str(v: str) -> str:
    """
    Escape a text value for SQL.

    - Single quotes are doubled: ' → ''
    - If the value contains a backslash after escaping, wrap in E'...' so that
      the escape-string syntax is used; otherwise wrap in plain '...'.
    """
    escaped = v.replace("'", "''")
    if "\\" in escaped:
        return f"E'{escaped}'"
    return f"'{escaped}'"


def convert_value(col: str, raw: str) -> str:
    """Convert a raw CSV cell into a SQL literal."""
    if col in SKIP_COLS:
        raise ValueError(f"Column '{col}' should be skipped before calling convert_value")

    stripped = raw.strip()

    # JSONB columns
    if col in JSONB_COLS:
        if stripped == "":
            return "'[]'::jsonb"
        # Escape single quotes before wrapping in SQL string literal
        escaped = stripped.replace("'", "''")
        return f"'{escaped}'::jsonb"

    # weight → bare numeric literal
    if col == "weight":
        if stripped == "":
            return "NULL"
        return stripped  # e.g. "1.5"

    # updated_at → timestamptz cast
    if col == "updated_at":
        if stripped == "":
            return "NULL"
        return f"'{stripped}'::timestamptz"

    # Regular text columns
    if stripped == "" and col not in NON_NULLABLE:
        return "NULL"

    return sql_str(stripped)


def rows_to_values(rows: list[dict], columns: list[str]) -> str:
    """Render a list of dicts into a SQL VALUES block (each row on its own line)."""
    value_rows = []
    for row in rows:
        parts = []
        for col in columns:
            if col in SKIP_COLS:
                continue
            parts.append(convert_value(col, row.get(col, "")))
        value_rows.append("  (" + ", ".join(parts) + ")")
    return ",\n".join(value_rows)


def read_csv(path: str) -> tuple[list[str], list[dict]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)
        fieldnames = list(reader.fieldnames) if reader.fieldnames else []
    return fieldnames, rows


def main() -> None:
    # --- Articles ---
    art_columns, art_rows = read_csv(ARTICLES_CSV)
    # Only keep the columns we actually want to insert
    art_insert_cols = [c for c in art_columns if c not in SKIP_COLS]

    # --- Snippets ---
    snip_columns, snip_rows = read_csv(SNIPPETS_CSV)
    snip_insert_cols = [c for c in snip_columns if c not in SKIP_COLS]

    # --- Build SQL ---
    art_col_list = ", ".join(art_insert_cols)
    snip_col_list = ", ".join(snip_insert_cols)

    art_values = rows_to_values(art_rows, art_columns)
    snip_values = rows_to_values(snip_rows, snip_columns)

    sql = f"""\
-- Reseed knowledge base
DELETE FROM public.knowledge_snippets;
DELETE FROM public.knowledge_articles;

-- Articles
INSERT INTO public.knowledge_articles ({art_col_list})
VALUES
{art_values};

-- Snippets
INSERT INTO public.knowledge_snippets ({snip_col_list})
VALUES
{snip_values};
"""

    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"Migration written to: {OUTPUT_SQL}")
    print(f"  Articles : {len(art_rows)} rows")
    print(f"  Snippets : {len(snip_rows)} rows")


if __name__ == "__main__":
    main()
