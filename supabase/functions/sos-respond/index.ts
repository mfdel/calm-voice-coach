import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      problem_category,
      note_text,
      child_snapshot,
      parenting_snapshot,
      child_id,
    } = await req.json();

    const startTime = Date.now();

    // Build system prompt per V1_PROMPT_RAG_STRATEGY.md
    const systemPrompt = `You are ParentPilot, a calm parenting SOS assistant.

Your job is to help a parent in a stressful moment with short, practical, emotionally intelligent guidance.

Rules:
- Respect the parent's red lines and never recommend forbidden tactics.
- Prefer concrete next steps over theory.
- Keep suggestions grounded in the child's age, triggers, and what has worked before.
- Do not shame, moralize, or overwhelm the parent.
- Give 2-3 suggestions max.
- Each suggestion must include one exact script the parent can say.`;

    // Build user prompt sections
    const sections: string[] = [];

    if (parenting_snapshot) {
      sections.push(`PARENTING STYLE:
- style: ${parenting_snapshot.style || "gentle"}
- values: ${(parenting_snapshot.values || []).join(", ")}
- red lines: ${(parenting_snapshot.red_lines || []).join(", ")}`);
    }

    if (child_snapshot) {
      sections.push(`CHILD PROFILE:
- age group: ${child_snapshot.age_group || "unknown"}
- triggers: ${(child_snapshot.known_triggers || []).join(", ")}
- calming preferences: ${(child_snapshot.calming_preferences || []).join(", ")}`);
    }

    sections.push(`CURRENT SOS:
- problem category: ${problem_category}
- note: ${note_text || "No additional details provided."}`);

    sections.push(`RESPONSE FORMAT:
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
  "safety_note": null
}
- suggestions: 2-3 max
- script: immediately usable spoken language
- summary: concise, empathetic`);

    const userMessage = sections.join("\n\n");

    // Call Lovable AI
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
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback response
      parsed = {
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
    }

    const latencyMs = Date.now() - startTime;

    // Save incident
    const { data: incident, error: incError } = await supabase
      .from("incidents")
      .insert({
        user_id: user.id,
        child_id: child_id || null,
        problem_category,
        note_text: note_text || null,
        input_mode: "text",
        summary_text: parsed.summary,
        used_fallback: !aiData.choices?.[0]?.message?.content,
        latency_ms: latencyMs,
      })
      .select("id")
      .single();

    if (incError) console.error("Incident save error:", incError);

    // Save suggestions
    if (incident && parsed.suggestions) {
      const sugRows = parsed.suggestions.map((s: any, i: number) => ({
        incident_id: incident.id,
        position: i,
        title: s.title,
        reason: s.reason,
        script: s.script,
        source_type: "llm",
      }));
      const { error: sugError } = await supabase.from("incident_suggestions").insert(sugRows);
      if (sugError) console.error("Suggestions save error:", sugError);
    }

    return new Response(JSON.stringify({
      incident_id: incident?.id,
      summary: parsed.summary,
      suggestions: parsed.suggestions || [],
      safety_note: parsed.safety_note || null,
      used_fallback: !aiData.choices?.[0]?.message?.content,
      latency_ms: latencyMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("SOS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
