"""
ParentPilot SOS Pipeline — LangGraph reimplementation

This script is a learning exercise that mirrors the logic in
supabase/functions/sos-respond/index.ts as a LangGraph state graph.

Run it to see the pipeline visualised and traced in LangSmith.

Setup:
    pip install langgraph langchain-google-genai langsmith supabase python-dotenv

Environment variables (create a .env file in this directory):
    LANGCHAIN_TRACING_V2=true
    LANGCHAIN_API_KEY=ls__your_key_here
    LANGCHAIN_PROJECT=parentpilot-sos        # optional — groups traces in LangSmith
    GOOGLE_API_KEY=your_gemini_key
    SUPABASE_URL=https://gymzdcweqkqbibeihdsn.supabase.co
    SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_USER_JWT=a_valid_user_jwt        # for auth-gated queries
"""

from __future__ import annotations

import json
import os
from typing import TypedDict, Optional

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langsmith import traceable
from langgraph.graph import StateGraph, START, END
from supabase import create_client, Client

load_dotenv()

# ── Supabase client (uses user JWT for RLS-compliant queries) ──────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
USER_JWT = os.environ.get("SUPABASE_USER_JWT", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
if USER_JWT:
    supabase.postgrest.auth(USER_JWT)

# ── LLM ──────────────────────────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.4)

# ── Red-line keyword map (mirrors the Deno edge function) ────────────────────
RED_LINE_KEYWORDS: dict[str, list[str]] = {
    "cry_it_out": ["cry it out", "let them cry", "extinction method", "ferber"],
    "time_outs": ["time out", "time-out", "naughty step", "naughty chair"],
    "physical_punishment": ["spank", "smack", "hit", "slap", "physical discipline"],
    "yelling": ["yell at", "raise your voice", "shout at"],
    "screen_bribery": ["give them the ipad", "let them watch", "screen as reward"],
    "food_rewards": ["reward with food", "dessert if you", "candy if you"],
    "shame_language": ["you should be ashamed", "bad boy", "bad girl", "what's wrong with you"],
    "comparison": ["your brother doesn't", "your sister can", "why can't you be like"],
}

FALLBACK_RESPONSE = {
    "summary": "This seems like a high-stress moment. Start by lowering stimulation.",
    "suggestions": [
        {"title": "Pause and simplify", "reason": "One small step works better than more talking.",
         "script": "I am here. We're going to do one small step together."},
        {"title": "Offer one clear choice", "reason": "A bounded choice reduces power struggles.",
         "script": "Do you want option A or option B?"},
    ],
    "safety_note": None,
}


# ── State definition ──────────────────────────────────────────────────────────
class SOSState(TypedDict):
    # Inputs
    user_id: str
    problem_category: str
    note_text: Optional[str]
    child_snapshot: dict       # age_group, known_triggers, calming_preferences
    parenting_snapshot: dict   # style, values, red_lines
    # Populated during retrieval
    kb_snippets: list[dict]
    prior_learnings: list[str]
    # Populated during generation
    assembled_prompt: str
    llm_raw_response: str
    parsed_response: Optional[dict]
    # Validation
    red_line_violation: bool
    retry_count: int
    used_fallback: bool
    # Final output
    result: Optional[dict]


# ── Node 1: Retrieve KB snippets ──────────────────────────────────────────────
@traceable(name="retrieve_kb_snippets")
def retrieve_kb(state: SOSState) -> dict:
    """
    Hard-filter knowledge_snippets by problem_category + age_group,
    exclude any blocked by the parent's red lines,
    then score and return the top 4.

    This mirrors STEP 1 in sos-respond/index.ts.
    """
    problem_category = state["problem_category"]
    age_group = state["child_snapshot"].get("age_group", "toddler")
    red_lines: list[str] = state["parenting_snapshot"].get("red_lines", [])
    child_triggers: list[str] = [t.lower() for t in state["child_snapshot"].get("known_triggers", [])]

    response = (
        supabase.table("knowledge_snippets")
        .select("*, knowledge_articles!inner(problem_category, age_groups)")
        .eq("knowledge_articles.problem_category", problem_category)
        .execute()
    )
    raw = response.data or []

    # Filter by age group and red lines
    filtered = [
        s for s in raw
        if age_group in (s.get("knowledge_articles") or {}).get("age_groups", [])
        and not any(b in red_lines for b in (s.get("blocked_by_red_lines") or []))
    ]

    # Hybrid scoring: 0.40 problem + 0.20 age + 0.20 trigger_overlap + 0.15 weight + 0.05 recency
    def score(s: dict) -> float:
        triggers = [t.lower() for t in (s.get("applicable_triggers") or [])]
        if child_triggers and triggers:
            overlap = sum(
                1 for t in triggers
                if any(ct in t or t in ct for ct in child_triggers)
            ) / max(len(triggers), 1)
        else:
            overlap = 0.5
        weight_boost = min((s.get("weight") or 1.0) / 2.0, 1.0)
        return 0.40 + 0.20 + 0.20 * overlap + 0.15 * weight_boost + 0.05 * 0.5

    filtered.sort(key=score, reverse=True)
    return {"kb_snippets": filtered[:4]}


# ── Node 2: Retrieve prior incident outcomes ──────────────────────────────────
@traceable(name="retrieve_prior_incidents")
def retrieve_history(state: SOSState) -> dict:
    """
    Fetch the 3 most recent incidents for this user + problem category
    that have feedback, and compress them into outcome strings.

    This mirrors STEP 2 in sos-respond/index.ts.
    """
    response = (
        supabase.table("incidents")
        .select("summary_text, problem_category, incident_feedback(outcome)")
        .eq("user_id", state["user_id"])
        .eq("problem_category", state["problem_category"])
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    learnings = []
    for inc in (response.data or []):
        if inc.get("incident_feedback") and inc.get("summary_text"):
            outcome = (inc["incident_feedback"] or {}).get("outcome", "unknown")
            label = "✓ WORKED" if outcome == "helpful" else "✗ DID NOT WORK" if outcome == "misaligned" else "? UNKNOWN"
            learnings.append(f'- [{label}] "{inc["summary_text"]}"')
    return {"prior_learnings": learnings[:3]}


# ── Node 3: Assemble prompt ───────────────────────────────────────────────────
@traceable(name="assemble_prompt")
def assemble_prompt(state: SOSState) -> dict:
    """
    Build the system prompt + user message from child profile, parenting
    preferences, retrieved snippets, and prior learnings.

    This mirrors STEP 3 in sos-respond/index.ts.
    """
    ps = state["parenting_snapshot"]
    cs = state["child_snapshot"]
    red_lines: list[str] = ps.get("red_lines", [])
    age_group = cs.get("age_group", "toddler")

    RED_LINE_LABELS = {
        "cry_it_out": "cry it out / extinction sleep training",
        "time_outs": "time-outs / sending child to room as punishment",
        "physical_punishment": "any physical punishment",
        "yelling": "raising voice or yelling at the child",
        "screen_bribery": "using screens as a bribe or behavioral reward",
        "food_rewards": "using food or treats as a behavioral reward",
        "shame_language": 'shame language ("bad boy/girl")',
        "comparison": "comparing to siblings or other children",
    }
    human_red_lines = [RED_LINE_LABELS.get(rl, rl) for rl in red_lines]
    red_line_block = (
        "\n\n## This Parent's Forbidden Tactics (Absolute Hard Stops)\n"
        + "\n".join(f"- {rl}" for rl in human_red_lines)
    ) if human_red_lines else ""

    system = (
        "You are ParentPilot — a calm, warm parenting coach responding to a parent in crisis RIGHT NOW."
        + red_line_block
        + "\n\nReturn JSON with keys: summary (str), suggestions (list of {title,reason,script}), safety_note (str|null)."
        + "\nExactly 2-3 suggestions. Every script ≤ 25 words, speakable immediately."
    )

    sections = []
    sections.append(
        f"<context>\nPARENTING STYLE: {ps.get('style','gentle')}\n"
        f"VALUES: {', '.join(ps.get('values', []))}\n</context>"
    )
    sections.append(
        f"<child>\nAGE GROUP: {age_group}\n"
        f"KNOWN TRIGGERS: {', '.join(cs.get('known_triggers', [])) or 'none listed'}\n"
        f"CALMING PREFERENCES: {', '.join(cs.get('calming_preferences', [])) or 'none listed'}\n</child>"
    )
    sections.append(
        f"<situation>\nPROBLEM CATEGORY: {state['problem_category']}\n"
        f"PARENT'S NOTE: {state.get('note_text') or 'No additional details.'}\n</situation>"
    )
    if state["kb_snippets"]:
        snippet_text = "\n\n".join(
            f"[{i+1}] ({s.get('snippet_type')}) {s.get('title')}\n{s.get('content')}"
            for i, s in enumerate(state["kb_snippets"])
        )
        sections.append(f"<evidence>\n{snippet_text}\n</evidence>")
    if state["prior_learnings"]:
        learnings = "\n".join(state["prior_learnings"])
        sections.append(f"<prior_outcomes>\n{learnings}\n</prior_outcomes>")

    return {
        "assembled_prompt": f"SYSTEM:\n{system}\n\nUSER:\n" + "\n\n".join(sections)
    }


# ── Node 4: Call LLM ──────────────────────────────────────────────────────────
@traceable(name="call_llm")
def call_llm(state: SOSState) -> dict:
    """
    Send the assembled prompt to Gemini and capture the raw response text.
    LangSmith auto-traces the LLM call when LANGCHAIN_TRACING_V2=true.
    """
    parts = state["assembled_prompt"].split("\n\nUSER:\n", 1)
    system_text = parts[0].replace("SYSTEM:\n", "", 1)
    user_text = parts[1] if len(parts) > 1 else ""

    response = llm.invoke([
        SystemMessage(content=system_text),
        HumanMessage(content=user_text),
    ])
    return {"llm_raw_response": response.content, "retry_count": state.get("retry_count", 0)}


# ── Node 5a: Parse & validate ─────────────────────────────────────────────────
@traceable(name="parse_and_validate")
def parse_and_validate(state: SOSState) -> dict:
    raw = state["llm_raw_response"]
    red_lines: list[str] = state["parenting_snapshot"].get("red_lines", [])

    try:
        # strip markdown code fences if present
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return {"parsed_response": None, "red_line_violation": False, "used_fallback": True}

    # Post-generation red-line keyword check (mirrors STEP 5 in index.ts)
    full_text = json.dumps(parsed).lower()
    violation = any(
        kw in full_text
        for rl in red_lines
        for kw in RED_LINE_KEYWORDS.get(rl, [])
    )

    # Cap suggestions at 3
    if isinstance(parsed.get("suggestions"), list):
        parsed["suggestions"] = parsed["suggestions"][:3]

    return {
        "parsed_response": parsed,
        "red_line_violation": violation,
        "used_fallback": False,
    }


# ── Node 5b: Use fallback ─────────────────────────────────────────────────────
def use_fallback(state: SOSState) -> dict:
    return {"result": FALLBACK_RESPONSE, "used_fallback": True}


# ── Node 6: Finalise result ───────────────────────────────────────────────────
def finalise(state: SOSState) -> dict:
    return {"result": state["parsed_response"]}


# ── Conditional edge: route after validation ──────────────────────────────────
def route_after_validation(state: SOSState) -> str:
    """
    - If parse failed or red-line violated → fallback
    - If retry count < 1 and violation → retry (retry_count increments)
    - Otherwise → finalise
    """
    if state.get("used_fallback") or state.get("parsed_response") is None:
        return "fallback"
    if state.get("red_line_violation"):
        if state.get("retry_count", 0) < 1:
            return "retry"
        return "fallback"
    return "finalise"


# ── Build the graph ───────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    g = StateGraph(SOSState)

    g.add_node("retrieve_kb", retrieve_kb)
    g.add_node("retrieve_history", retrieve_history)
    g.add_node("assemble_prompt", assemble_prompt)
    g.add_node("call_llm", call_llm)
    g.add_node("parse_and_validate", parse_and_validate)
    g.add_node("finalise", finalise)
    g.add_node("fallback", use_fallback)

    # Both retrieval nodes run first (they're independent — LangGraph fans them out)
    g.add_edge(START, "retrieve_kb")
    g.add_edge(START, "retrieve_history")

    # Both must complete before prompt assembly
    g.add_edge("retrieve_kb", "assemble_prompt")
    g.add_edge("retrieve_history", "assemble_prompt")

    g.add_edge("assemble_prompt", "call_llm")
    g.add_edge("call_llm", "parse_and_validate")

    # Conditional routing after validation
    g.add_conditional_edges(
        "parse_and_validate",
        route_after_validation,
        {
            "finalise": "finalise",
            "retry": "call_llm",   # loops back with incremented retry_count
            "fallback": "fallback",
        },
    )

    g.add_edge("finalise", END)
    g.add_edge("fallback", END)

    return g


sos_graph = build_graph().compile()


# ── Example run ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    example_input: SOSState = {
        "user_id": "replace-with-a-real-user-uuid",
        "problem_category": "bedtime_resistance",
        "note_text": "Skipped nap and screaming about pajamas.",
        "child_snapshot": {
            "age_group": "toddler",
            "known_triggers": ["transitions", "fatigue"],
            "calming_preferences": ["choices", "quiet_voice"],
        },
        "parenting_snapshot": {
            "style": "gentle",
            "values": ["connection", "clear_boundaries"],
            "red_lines": ["cry_it_out", "shame_language"],
        },
        # These get populated by the graph:
        "kb_snippets": [],
        "prior_learnings": [],
        "assembled_prompt": "",
        "llm_raw_response": "",
        "parsed_response": None,
        "red_line_violation": False,
        "retry_count": 0,
        "used_fallback": False,
        "result": None,
    }

    print("Running SOS pipeline…\n")
    final_state = sos_graph.invoke(example_input)

    result = final_state.get("result", {})
    print("─" * 60)
    print("SUMMARY:", result.get("summary"))
    print()
    for i, s in enumerate(result.get("suggestions", []), 1):
        print(f"Suggestion {i}: {s.get('title')}")
        print(f"  Why: {s.get('reason')}")
        print(f"  Say: \"{s.get('script')}\"")
    print("─" * 60)
    print(f"used_fallback={final_state['used_fallback']}  red_line_violation={final_state['red_line_violation']}")
    print("\nCheck LangSmith for the full trace →  https://smith.langchain.com")
