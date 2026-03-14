---
description: "Run a comprehensive multi-agent literature review on a research topic — searches academic databases, synthesizes findings, and produces an analytical review"
mode: agent
agent: literature-review-orchestrator
tools: ["agent/runSubagent", "read/readFile", "edit/createFile", "edit/editFiles", "edit/createDirectory", "execute/runInTerminal", "execute/getTerminalOutput", "search/fileSearch", "search/listDirectory", "web/fetch", "memory", "todo"]
---

# Literature Review Request

Conduct a comprehensive literature review using the multi-agent workflow.

**Topic**: $ARGUMENTS

## Workflow

1. **Plan** the review domains — decompose the topic into 3-8 focused research areas
2. **Search** academic databases in parallel (Semantic Scholar, OpenAlex, arXiv)
3. **Design** the synthesis outline — organize by theme, not by domain
4. **Write** sections in parallel — analytical academic prose with verified citations
5. **Assemble** the final review with references

## Output

Write all files to `reviews/<topic-slug>/` directory.
Final output: `reviews/<topic-slug>/literature-review-final.md`

## Constraints

- Use `python3` for any Python scripts (ensure `requests` is installed: `pip3 install requests`)
- Only cite papers found via API searches — **never fabricate citations**
- Target 3000-5000 words for the final review
- Use Author-Date citation format (e.g., Smith et al., 2023)
- Analytical prose — no paper-by-paper summaries
