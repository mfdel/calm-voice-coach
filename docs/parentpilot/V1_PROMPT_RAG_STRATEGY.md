# ParentPilot v1 Prompt and RAG Strategy

## Goal

Generate advice that feels:
- fast
- grounded
- family-aligned
- better than generic chatbot output

The core mechanism is:
1. normalize the SOS request
2. retrieve relevant parenting guidance and similar prior incidents
3. assemble a constrained prompt
4. generate structured JSON
5. validate against red lines and response schema

## Input normalization

## 1. Canonical input object
Every SOS request should normalize into this shape before retrieval:

```json
{
  "problem_category": "bedtime_resistance",
  "note_text": "Skipped nap and screaming about pajamas.",
  "child_age_group": "toddler",
  "child_triggers": ["transitions", "fatigue"],
  "calming_preferences": ["choices", "quiet_voice"],
  "parenting_style": "gentle",
  "values": ["connection", "clear_boundaries"],
  "red_lines": ["cry_it_out", "physical_punishment", "shame_language"],
  "recent_incident_summaries": []
}
```

## 2. Normalization rules

### Problem category
- Prefer explicit user-picked category from the problem picker
- If the free note strongly conflicts, record both:
  - `problem_category`
  - `secondary_signals`

### Free text cleanup
- trim whitespace
- limit to ~300-500 chars
- redact obvious names where possible
- normalize repeated punctuation and all-caps stress text

### Voice note policy
- Voice notes are transcribed on-device only.
- If device transcription is unavailable, unsupported, permission-blocked, or fails, the app should warn the user and switch to text-only note entry.
- Raw audio is never sent to a transcription endpoint.

### Context signal extraction
Use deterministic extraction first, not another model call.

Example signals:
- `fatigue`
- `transition`
- `hunger`
- `sibling_conflict`
- `public_setting`
- `sensory_overload`
- `schedule_change`

## Retrieval strategy

## 3. Retrieval inputs
Retrieval should use:
- problem category
- age group
- extracted context signals
- red lines
- positive / negative prior incident outcomes

## 4. Retrieval pipeline

### Step 1: hard filter
Filter KB snippets by:
- exact `problem_category`
- compatible `age_group`

### Step 2: red-line compatibility
Exclude snippets with `blocked_by_red_lines` overlap.

### Step 3: hybrid ranking
Score remaining snippets by:

$$
score = 0.40(problem\_match) + 0.20(age\_match) + 0.20(trigger\_overlap) + 0.15(history\_boost) + 0.05(recency\_boost)
$$

Where:
- `problem_match` is usually binary
- `trigger_overlap` is based on matching extracted signals to snippet trigger tags
- `history_boost` favors strategies that previously led to helpful outcomes
- `recency_boost` gives a slight preference to more recent relevant learnings

### Step 4: prior incident retrieval
Retrieve 2-3 prior incidents matching:
- same problem category
- same child
- recent helpful or misaligned feedback

Use them as compressed learnings, not raw transcripts.

## 5. What gets retrieved

For v1, retrieve:
- 2-4 KB snippets
- 1-2 example scripts
- 2-3 prior incident summaries

Do **not** dump large chunks of text into the prompt. Summarize before assembly.

## Prompt assembly order

## 6. Assembly principles

- Put hard constraints first
- Keep the current situation above old history
- Use retrieved content as evidence, not as a giant paste dump
- Ask for a compact structured response designed for a small mobile view

## 7. Prompt section order

1. **System role and safety contract**
2. **Parenting style + red lines**
3. **Child profile snapshot**
4. **Current SOS situation**
5. **Retrieved guidance snippets**
6. **Recent incident learnings**
7. **Response schema contract**

## 8. Recommended system prompt

```text
You are ParentPilot, a calm parenting SOS assistant.

Your job is to help a parent in a stressful moment with short, practical, emotionally intelligent guidance.

Rules:
- Respect the parent's red lines and never recommend forbidden tactics.
- Prefer concrete next steps over theory.
- Keep suggestions grounded in the child's age, triggers, and what has worked before.
- Do not shame, moralize, or overwhelm the parent.
- Return only valid JSON that matches the requested schema.
- Give 2-3 suggestions max.
- Each suggestion must include one exact script the parent can say.
```

## 9. Anthropic-style prompt skeleton

```json
{
  "model": "claude-fast-tier",
  "max_tokens": 450,
  "temperature": 0.4,
  "system": "You are ParentPilot, a calm parenting SOS assistant...",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "PARENTING STYLE\n- style: gentle\n- values: connection, clear boundaries\n- red lines: cry_it_out, physical_punishment, shame_language\n\nCHILD PROFILE\n- age group: toddler\n- triggers: transitions, fatigue\n- calming preferences: choices, quiet_voice\n\nCURRENT SOS\n- problem category: bedtime_resistance\n- note: Skipped nap and screaming about pajamas.\n- extracted signals: fatigue, transition\n\nRETRIEVED GUIDANCE\n1. Offer one bounded choice...\n2. Reduce language and lower stimulation...\n\nRECENT INCIDENT LEARNINGS\n- Yesterday: giving one small choice helped quickly.\n- Last week: too much talking made the situation worse.\n\nRETURN JSON WITH THIS SHAPE\n{\n  \"summary\": \"...\",\n  \"suggestions\": [\n    {\n      \"title\": \"...\",\n      \"reason\": \"...\",\n      \"script\": \"...\"\n    }\n  ],\n  \"safety_note\": null\n}"
        }
      ]
    }
  ]
}
```

## Output contract

## 10. Required JSON schema

```json
{
  "summary": "short situation framing",
  "suggestions": [
    {
      "title": "short action title",
      "reason": "why this fits now",
      "script": "exact words parent can say"
    }
  ],
  "safety_note": null
}
```

Constraints:
- `summary`: 1-2 sentences max
- `suggestions`: 2-3 max
- `title`: short enough for a button/card header
- `reason`: concise, not essay-like
- `script`: immediately usable spoken language

## Red-lines enforcement strategy

## 11. Three layers of enforcement

### Layer 1: retrieval-time blocking
Do not retrieve snippets incompatible with selected red lines.

### Layer 2: prompt-time hard constraints
Include explicit red lines in the prompt and instruct the model never to recommend them.

### Layer 3: post-generation validation
Run deterministic checks on returned JSON:
- forbidden tactic keywords
- shame / humiliation patterns
- invalid schema
- too many suggestions
- overly long script content

## 12. Retry policy
If validation fails:
1. retry once with stricter system language
2. if it still fails, use fallback response

## Fallback behavior

## 13. Weak retrieval fallback
If retrieval confidence is low:
- use the best safe KB snippet directly
- label the response internally as fallback
- avoid pretending the answer is deeply personalized

## 14. LLM failure fallback
If timeout or invalid output persists:
Return a safe generic de-escalation response:

```json
{
  "summary": "This seems like a high-stress moment. Start by lowering stimulation and simplifying your next step.",
  "suggestions": [
    {
      "title": "Pause and simplify",
      "reason": "A calmer parent and one simple next step often work better than more talking.",
      "script": "I am here. We're going to do one small step together."
    },
    {
      "title": "Offer one clear choice",
      "reason": "A bounded choice can reduce a power struggle without losing structure.",
      "script": "Do you want option A or option B?"
    }
  ],
  "safety_note": null
}
```

## 15. Safety escalation fallback
If the note suggests possible immediate danger:
- return a safety note
- reduce normal coaching content
- instruct the parent to prioritize safety and adult help

## Ranking and learning loop

## 16. How feedback improves future retrieval
Positive outcomes should boost:
- same problem category
- same trigger pattern
- same snippet family

Negative outcomes should down-rank:
- same snippet family
- same overly verbose advice patterns
- tactics repeatedly marked misaligned

A simple first-pass update rule:

$$
new\_snippet\_weight = old\_weight + 0.1(helpful) - 0.15(misaligned)
$$

Clamp weights to a sane range to avoid runaway personalization.

## 17. First version recommendation
For the first beta, keep the prompt strategy deliberately simple:
- one canonical taxonomy
- deterministic signal extraction
- hybrid retrieval
- one compact JSON schema
- one retry max
- one safe fallback path

That gets you a system that is explainable, testable, and much more trustworthy than an unstructured LLM call.
