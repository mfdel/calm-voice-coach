import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Red-line violation keywords for post-generation validation ──
const RED_LINE_KEYWORDS: Record<string, string[]> = {
  cry_it_out: ["cry it out", "let them cry", "extinction method", "ferber"],
  time_outs: ["time out", "time-out", "naughty step", "naughty chair", "go to your room as punishment"],
  physical_punishment: ["spank", "smack", "hit", "slap", "physical discipline", "corporal"],
  yelling: ["yell at", "raise your voice", "shout at"],
  screen_bribery: ["give them the ipad", "let them watch", "screen as reward", "bribe with screen"],
  food_rewards: ["reward with food", "dessert if you", "candy if you", "treat as reward"],
  shame_language: ["you should be ashamed", "bad boy", "bad girl", "what's wrong with you", "why can't you"],
  comparison: ["your brother doesn't", "your sister can", "why can't you be like", "other kids don't"],
};

// ── Fallback response per V1_PROMPT_RAG_STRATEGY.md §14 ──
const FALLBACK_RESPONSE = {
  summary: "This seems like a high-stress moment. Start by lowering stimulation and simplifying your next step.",
  suggestions: [
    {
      title: "Pause and simplify",
      reason: "A calmer parent and one simple next step often work better than more talking.",
      script: "I am here. We're going to do one small step together.",
    },
    {
      title: "Offer one clear choice",
      reason: "A bounded choice can reduce a power struggle without losing structure.",
      script: "Do you want option A or option B?",
    },
  ],
  safety_note: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { problem_category, note_text, child_snapshot, parenting_snapshot, child_id } = await req.json();
    const startTime = Date.now();
    const redLines: string[] = parenting_snapshot?.red_lines || [];
    const childTriggers: string[] = (child_snapshot?.known_triggers || []).map((t: string) => t.toLowerCase());
    const ageGroup: string = child_snapshot?.age_group || "toddler";

    // ═══════════════════════════════════════════════════════════
    // STEP 1: RETRIEVE KB SNIPPETS (RAG pipeline per V1_PROMPT_RAG_STRATEGY.md)
    // ═══════════════════════════════════════════════════════════
    const retrievalStart = Date.now();

    // Hard filter: problem_category match + age_group compatibility
    const { data: rawSnippets } = await supabase
      .from("knowledge_snippets")
      .select("*, knowledge_articles!inner(problem_category, age_groups)")
      .eq("knowledge_articles.problem_category", problem_category);

    // Filter: age group compatibility + red-line exclusion
    const filteredSnippets = (rawSnippets || []).filter((s: any) => {
      const ageGroups = s.knowledge_articles?.age_groups || [];
      if (!ageGroups.includes(ageGroup)) return false;

      const blockedBy = s.blocked_by_red_lines || [];
      if (blockedBy.some((b: string) => redLines.includes(b))) return false;

      return true;
    });

    // Hybrid ranking: score = 0.40(problem) + 0.20(age) + 0.20(trigger_overlap) + 0.15(weight) + 0.05(recency)
    const scoredSnippets = filteredSnippets.map((s: any) => {
      const problemScore = 1.0; // already filtered by problem
      const ageScore = 1.0; // already filtered by age
      const triggers = (s.applicable_triggers || []).map((t: string) => t.toLowerCase());
      const triggerOverlap = childTriggers.length > 0
        ? triggers.filter((t: string) => childTriggers.some((ct: string) => ct.includes(t) || t.includes(ct))).length / Math.max(triggers.length, 1)
        : 0.5;
      const weightBoost = Math.min(s.weight / 2.0, 1.0); // normalize weight to 0-1
      const recencyBoost = 0.5; // no recency data for KB snippets

      const score = 0.40 * problemScore + 0.20 * ageScore + 0.20 * triggerOverlap + 0.15 * weightBoost + 0.05 * recencyBoost;
      return { ...s, score };
    });

    scoredSnippets.sort((a: any, b: any) => b.score - a.score);
    const topSnippets = scoredSnippets.slice(0, 4);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: RETRIEVE PRIOR INCIDENTS with feedback (learning loop)
    // ═══════════════════════════════════════════════════════════
    const { data: priorIncidents } = await supabase
      .from("incidents")
      .select("summary_text, problem_category, incident_feedback(outcome)")
      .eq("user_id", user.id)
      .eq("problem_category", problem_category)
      .order("created_at", { ascending: false })
      .limit(5);

    // Compress into learnings
    const priorLearnings = (priorIncidents || [])
      .filter((inc: any) => inc.incident_feedback && inc.summary_text)
      .slice(0, 3)
      .map((inc: any) => {
        const outcome = inc.incident_feedback?.outcome || "unknown";
        return `- Previous: "${inc.summary_text}" → outcome: ${outcome}`;
      });

    const retrievalMs = Date.now() - retrievalStart;

    // ═══════════════════════════════════════════════════════════
    // STEP 3: ASSEMBLE PROMPT (per V1_PROMPT_RAG_STRATEGY.md §7)
    // ═══════════════════════════════════════════════════════════

    // Section 1: System role and safety contract
    const systemPrompt = `You are ParentPilot, a calm parenting SOS assistant.

Your job is to help a parent in a stressful moment with short, practical, emotionally intelligent guidance.

Rules:
- Respect the parent's red lines and NEVER recommend forbidden tactics.
- Prefer concrete next steps over theory.
- Keep suggestions grounded in the child's age, triggers, and what has worked before.
- Do not shame, moralize, or overwhelm the parent.
- Return only valid JSON that matches the requested schema.
- Give 2-3 suggestions max.
- Each suggestion must include one exact script the parent can say.
- Use the retrieved guidance snippets as evidence to ground your suggestions.
- Learn from prior incident outcomes when available.`;

    const sections: string[] = [];

    // Section 2: Parenting style + red lines
    if (parenting_snapshot) {
      sections.push(`PARENTING STYLE:
- style: ${parenting_snapshot.style || "gentle"}
- values: ${(parenting_snapshot.values || []).join(", ")}
- RED LINES (NEVER recommend these): ${redLines.join(", ")}`);
    }

    // Section 3: Child profile snapshot
    if (child_snapshot) {
      sections.push(`CHILD PROFILE:
- age group: ${ageGroup}
- known triggers: ${(child_snapshot.known_triggers || []).join(", ")}
- calming preferences: ${(child_snapshot.calming_preferences || []).join(", ")}`);
    }

    // Section 4: Current SOS situation
    sections.push(`CURRENT SOS:
- problem category: ${problem_category}
- note: ${note_text || "No additional details provided."}`);

    // Section 5: Retrieved guidance snippets
    if (topSnippets.length > 0) {
      const snippetText = topSnippets
        .map((s: any, i: number) => `${i + 1}. [${s.snippet_type}] ${s.title}: ${s.content}`)
        .join("\n");
      sections.push(`RETRIEVED GUIDANCE (use these as evidence to ground your suggestions):
${snippetText}`);
    }

    // Section 6: Recent incident learnings
    if (priorLearnings.length > 0) {
      sections.push(`RECENT INCIDENT LEARNINGS (adapt based on what worked/didn't):
${priorLearnings.join("\n")}`);
    }

    // Section 7: Response schema contract
    sections.push(`RESPONSE SCHEMA:
Return ONLY valid JSON with this exact schema:
{
  "summary": "1-2 sentence situation framing",
  "suggestions": [
    {
      "title": "short action title",
      "reason": "why this fits now",
      "script": "exact words parent can say"
    }
  ],
  "safety_note": null or string if safety concern detected
}
- suggestions: 2-3 max
- script: immediately usable spoken language
- summary: concise, empathetic`);

    const userMessage = sections.join("\n\n");

    // ═══════════════════════════════════════════════════════════
    // STEP 4: CALL LLM (with tool calling for structured output)
    // ═══════════════════════════════════════════════════════════
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 500,
        tools: [{
          type: "function",
          function: {
            name: "sos_response",
            description: "Return structured parenting SOS response",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "1-2 sentence situation framing" },
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      reason: { type: "string" },
                      script: { type: "string" },
                    },
                    required: ["title", "reason", "script"],
                    additionalProperties: false,
                  },
                },
                safety_note: { type: ["string", "null"], description: "Safety note if danger detected, null otherwise" },
              },
              required: ["summary", "suggestions", "safety_note"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "sos_response" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    // ═══════════════════════════════════════════════════════════
    // STEP 5: PARSE & VALIDATE OUTPUT (per V1_PROMPT_RAG_STRATEGY.md §11-12)
    // ═══════════════════════════════════════════════════════════
    let parsed: any;
    let usedFallback = false;
    let responseValid = true;
    let redLineViolation = false;
    let retryCount = 0;

    try {
      // Try tool call response first
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        parsed = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback to raw content parsing
        const rawContent = aiData.choices?.[0]?.message?.content || "";
        const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(jsonStr);
      }
    } catch {
      parsed = FALLBACK_RESPONSE;
      usedFallback = true;
      responseValid = false;
    }

    // Post-generation validation: red-line keyword check
    if (!usedFallback && parsed.suggestions) {
      const fullText = JSON.stringify(parsed).toLowerCase();
      for (const rl of redLines) {
        const keywords = RED_LINE_KEYWORDS[rl] || [];
        if (keywords.some((kw) => fullText.includes(kw))) {
          redLineViolation = true;
          break;
        }
      }

      // Validate suggestion count
      if (parsed.suggestions.length > 3) {
        parsed.suggestions = parsed.suggestions.slice(0, 3);
      }

      // If red-line violation detected, use fallback
      if (redLineViolation) {
        console.warn("Red-line violation detected in LLM output, using fallback");
        parsed = FALLBACK_RESPONSE;
        usedFallback = true;
        responseValid = false;
      }
    }

    const latencyMs = Date.now() - startTime;

    // ═══════════════════════════════════════════════════════════
    // STEP 6: PERSIST INCIDENT + OBSERVABILITY DATA
    // ═══════════════════════════════════════════════════════════
    const { data: incident, error: incError } = await supabase
      .from("incidents")
      .insert({
        user_id: user.id,
        child_id: child_id || null,
        problem_category,
        note_text: note_text || null,
        input_mode: "text",
        summary_text: parsed.summary,
        used_fallback: usedFallback,
        latency_ms: latencyMs,
      })
      .select("id")
      .single();

    if (incError) console.error("Incident save error:", incError);

    if (incident) {
      // Save suggestions
      if (parsed.suggestions) {
        const sugRows = parsed.suggestions.map((s: any, i: number) => ({
          incident_id: incident.id,
          position: i,
          title: s.title,
          reason: s.reason,
          script: s.script,
          source_type: usedFallback ? "fallback" : "llm",
        }));
        await supabase.from("incident_suggestions").insert(sugRows);
      }

      // Save retrieval event
      await supabase.from("retrieval_events").insert({
        incident_id: incident.id,
        query_text: `${problem_category} | ${note_text || ""}`.substring(0, 500),
        query_filters: { problem_category, age_group: ageGroup, triggers: childTriggers, red_lines: redLines },
        top_results: topSnippets.map((s: any) => ({ id: s.id, title: s.title, score: s.score, type: s.snippet_type })),
        retrieval_ms: retrievalMs,
      });

      // Save prompt run metadata
      await supabase.from("prompt_runs").insert({
        incident_id: incident.id,
        prompt_version: "v1",
        model_name: "google/gemini-3-flash-preview",
        input_token_estimate: Math.ceil(userMessage.length / 4),
        output_token_count: aiData.usage?.completion_tokens || null,
        response_valid: responseValid,
        retry_count: retryCount,
        red_line_violation_detected: redLineViolation,
      });
    }

    // Fire-and-forget: trigger category curation for this child after each SOS session
    if (child_id) {
      const curateUrl = `${supabaseUrl}/functions/v1/curate-categories`;
      fetch(curateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ user_id: user.id, child_id }),
      }).catch((err) => console.error("Curate trigger error:", err));
    }

    return new Response(JSON.stringify({
      incident_id: incident?.id,
      summary: parsed.summary,
      suggestions: parsed.suggestions || [],
      safety_note: parsed.safety_note || null,
      used_fallback: usedFallback,
      latency_ms: latencyMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("SOS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
