---
name: rag-pipeline-patterns
description: Retrieval scoring, prompt assembly, red-line enforcement, and observability patterns for the SOS pipeline
---

# RAG Pipeline Patterns — ParentPilot

## 1. Snippet Retrieval Scoring

The hybrid scoring formula used in `sos-respond`:

```typescript
interface ScoredSnippet {
  id: string;
  title: string;
  content: string;
  score: number;
}

function scoreSnippet(
  snippet: KnowledgeSnippet,
  request: SOSRequest,
  child: ChildProfile,
): number {
  const problemMatch = snippet.problem_category === request.problem_category ? 1 : 0;
  const ageMatch = snippet.age_groups.includes(child.age_group) ? 1 : 0;

  const childTriggers = child.known_triggers ?? [];
  const snippetTriggers = snippet.applicable_triggers ?? [];
  const triggerOverlap = childTriggers.filter(t => snippetTriggers.includes(t)).length;
  const maxTriggers = Math.max(childTriggers.length, 1);
  const triggerScore = triggerOverlap / maxTriggers;

  const weight = snippet.weight ?? 0.5; // normalized 0–1
  const recencyScore = computeRecency(snippet.updated_at); // 0–1, recent = higher

  return (
    0.40 * problemMatch +
    0.20 * ageMatch +
    0.20 * triggerScore +
    0.15 * weight +
    0.05 * recencyScore
  );
}

// Apply red-line filter BEFORE scoring
const eligibleSnippets = allSnippets.filter(s =>
  !s.blocked_by_red_lines?.some(code => userRedLineCodes.includes(code))
);

const scored = eligibleSnippets
  .map(s => ({ ...s, score: scoreSnippet(s, request, child) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5); // top 5
```

**Critical**: The red-line filter must run **before** scoring, not after.

---

## 2. Prompt Assembly Structure

Build the system prompt in this exact order:

```typescript
function buildSystemPrompt(params: PromptParams): string {
  return `
You are a calm, non-judgmental parenting coach. Your role is to provide immediate, actionable guidance to a parent in a high-stress moment.

## Your Safety Contract
You MUST follow these rules without exception:
- NEVER suggest the following approaches: ${params.redLines.map(r => r.label).join(', ')}
- If you cannot suggest anything without violating these rules, use the fallback response
- Keep language warm, non-blaming, and parent-affirming

## Parenting Style Context
Style: ${params.preferences.style}
Values: ${params.preferences.parenting_values?.join(', ') ?? 'not specified'}
Tone: ${params.preferences.tone_preferences?.join(', ') ?? 'warm and direct'}

## Child Profile
Name: ${params.child.display_name}
Age group: ${params.child.age_group}
Known triggers: ${params.child.known_triggers?.join(', ') ?? 'none specified'}
Calming preferences: ${params.child.calming_preferences?.join(', ') ?? 'none specified'}

## Current Situation
Problem: ${params.request.problem_category}
${params.request.note_text ? `Parent's note: ${params.request.note_text}` : ''}

## Guidance Snippets (use these as your knowledge base)
${params.snippets.map((s, i) => `${i + 1}. **${s.title}**: ${s.content}`).join('\n')}

## What Worked Before (recent similar situations)
${params.priorLearnings.length > 0
  ? params.priorLearnings.map(l => `- "${l.suggestion_title}": ${l.outcome}`).join('\n')
  : '- No prior history available'}

## Response Contract
Return JSON matching this exact schema:
{
  "summary": "1-2 sentences acknowledging the situation",
  "suggestions": [
    {
      "title": "Short action title (max 8 words)",
      "reason": "Why this helps (1 sentence, parenting-science grounded)",
      "script": "EXACT words the parent can say right now"
    }
  ],
  "safety_note": null
}
Return 2-3 suggestions. Scripts must be ≤ 3 sentences.
`.trim();
}
```

---

## 3. Post-Generation Red-Line Validation

```typescript
const RED_LINE_KEYWORDS: Record<string, string[]> = {
  cry_it_out: ['cry it out', 'cio', 'let them cry', 'leave them to cry'],
  time_outs: ['time-out', 'time out', 'timeout', 'sit in the corner', 'go to your room'],
  physical_punishment: ['spank', 'hit', 'smack', 'physical discipline'],
  yelling: ['yell', 'raise your voice', 'shout', 'scream at'],
  screen_bribery: ['give them the tablet', 'let them watch', 'screen time if'],
  food_rewards: ['give them a treat', 'candy if', 'dessert if', 'food reward'],
  shame_language: ['bad boy', 'bad girl', 'you should be ashamed', 'what is wrong with you'],
  comparison: ['your sister doesn\'t', 'other kids', 'why can\'t you be like'],
};

function validateOutput(
  suggestions: Suggestion[],
  userRedLineCodes: string[],
): { valid: boolean; violatedCodes: string[] } {
  const combinedText = suggestions
    .map(s => `${s.title} ${s.reason} ${s.script}`)
    .join(' ')
    .toLowerCase();

  const violatedCodes: string[] = [];

  for (const code of userRedLineCodes) {
    const keywords = RED_LINE_KEYWORDS[code] ?? [];
    if (keywords.some(kw => combinedText.includes(kw))) {
      violatedCodes.push(code);
    }
  }

  return { valid: violatedCodes.length === 0, violatedCodes };
}
```

**Rules:**
- Scan is case-insensitive (`toLowerCase()`)
- Scan covers title + reason + script for every suggestion
- Scan uses the **user's active red lines only** (not all 8)
- On violation: log to `prompt_runs`, serve fallback, set `used_fallback: true`

---

## 4. Fallback Response

When red-line validation fails or LLM errors:

```typescript
const SAFE_FALLBACK: SOSResponse = {
  summary: "This moment is hard. You're doing the right thing by pausing.",
  suggestions: [
    {
      title: "Take a breath together",
      reason: "Co-regulation: your calm nervous system helps regulate theirs.",
      script: "Let's both take three slow breaths. Ready? In... and out...",
    },
    {
      title: "Name what you see",
      reason: "Labeling emotions reduces their intensity in the brain.",
      script: "I can see you're really frustrated right now. That's okay.",
    },
  ],
  safety_note: null,
  used_fallback: true,
};
```

---

## 5. Observability — What to Log

```typescript
// prompt_runs insert
await adminClient.from('prompt_runs').insert({
  incident_id: incidentId,
  model_name: 'gemini-flash',
  input_tokens: usage.inputTokens,
  output_tokens: usage.outputTokens,
  latency_ms: Date.now() - startTime,
  red_line_violation_detected: !validation.valid,
  response_valid: validation.valid,
});

// retrieval_events insert
await adminClient.from('retrieval_events').insert({
  incident_id: incidentId,
  query_filters: { problem_category, age_group, trigger_count: childTriggers.length },
  top_results: scored.map(s => ({ id: s.id, score: s.score })),
  retrieval_ms: retrievalEnd - retrievalStart,
});
```
