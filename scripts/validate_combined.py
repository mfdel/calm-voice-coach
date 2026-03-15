import csv

print("=== ARTICLES: header + 3 new rows ===")
with open("docs/knowledge_articles_combined.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f, delimiter=";"))
print("Fields:", list(rows[0].keys()))
print(f"Total rows: {len(rows)}")
print()
for r in rows[15:18]:
    print("id         :", r["id"])
    print("category   :", r["problem_category"])
    print("title      :", r["title"])
    print("age_groups :", r["age_groups"])
    print("desc[:100] :", r["description"][:100])
    print("status     :", r["editorial_status"])
    print("source[:80]:", r["source_notes"][:80])
    print()

print("=== SNIPPETS: header + 2 new rows ===")
with open("docs/knowledge_snippets_combined.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f, delimiter=";"))
print("Fields:", list(rows[0].keys()))
print(f"Total rows: {len(rows)}")
print()
for r in rows[37:39]:
    print("id          :", r["id"])
    print("article_id  :", r["article_id"])
    print("type        :", r["snippet_type"])
    print("title       :", r["title"])
    print("content[:120]:", r["content"][:120])
    print("triggers    :", r["applicable_triggers"])
    print("red_lines   :", r["blocked_by_red_lines"])
    print("signals     :", r["success_signals"])
    print("weight      :", r["weight"])
    print()

print("=== Snippet type counts (new batch, rows 37+) ===")
from collections import Counter
types = Counter(r["snippet_type"] for r in rows[37:])
for k, v in sorted(types.items()):
    print(f"  {k:15s}: {v}")

print()
print("=== All article IDs ===")
with open("docs/knowledge_articles_combined.csv", newline="", encoding="utf-8") as f:
    arts = list(csv.DictReader(f, delimiter=";"))
for a in arts:
    print(f"  {a['id']}  {a['problem_category']:25s}  {a['title'][:55]}")
