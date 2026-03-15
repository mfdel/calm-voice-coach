import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function relativeDays(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

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

    const { child_id } = await req.json();
    if (!child_id) {
      return new Response(JSON.stringify({ error: "child_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for cached summary (< 24 hours old)
    const { data: cached } = await supabase
      .from("child_history_summaries")
      .select("summary_text, generated_at")
      .eq("child_id", child_id)
      .eq("user_id", user.id)
      .gte("generated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return new Response(JSON.stringify({
        summary_text: cached.summary_text,
        generated_at: cached.generated_at,
        cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch child profile
    const { data: child } = await supabase
      .from("child_profiles")
      .select("display_name, age_group, known_triggers")
      .eq("id", child_id)
      .eq("user_id", user.id)
      .single();

    if (!child) {
      return new Response(JSON.stringify({ error: "Child not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch parenting preferences for style-aligned forward suggestions
    const { data: parentingPrefs } = await supabase
      .from("parenting_preferences")
      .select("style, values")
      .eq("user_id", user.id)
      .single();

    // Fetch last 30 days of incidents for this child
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: incidents } = await supabase
      .from("incidents")
      .select(`
        problem_category, summary_text, created_at,
        incident_suggestions(title, reason, script),
        incident_feedback(outcome, reason_tags)
      `)
      .eq("child_id", child_id)
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    if (!incidents || incidents.length === 0) {
      return new Response(JSON.stringify({
        summary_text: "No sessions in the last 30 days for this child.",
        generated_at: new Date().toISOString(),
        cached: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Assemble prompt
    const sessionsText = incidents.map((inc: any, i: number) => {
      const suggestions = (inc.incident_suggestions || [])
        .map((s: any) => `  - ${s.title}: ${s.reason}${s.script ? `\n    Script used: "${s.script}"` : ""}`)
        .join("\n");
      const feedback = inc.incident_feedback;
      const feedbackText = feedback
        ? `  Feedback: ${feedback.outcome}${feedback.reason_tags ? ` (${(feedback.reason_tags as string[]).join(", ")})` : ""}`
        : "  Feedback: none";
      return `${i + 1}. [${inc.problem_category}] ${inc.summary_text || "No summary"} (${relativeDays(inc.created_at)})\n${suggestions}\n${feedbackText}`;
    }).join("\n\n");

    const parentingStyle = parentingPrefs?.style || "balanced";
    const parentingValues = (parentingPrefs?.values || []).join(", ") || "not specified";

    const systemMessage = `You are ParentPilot, a warm and practical parenting coach writing a monthly progress summary for a parent.

Write exclusively in flowing, empathetic paragraphs — no bullet points, no headers, no markdown formatting.
Tone: warm but direct, like a knowledgeable friend reviewing their child's month together. No clinical jargon. No moralizing.
Be specific — reference actual session content and scripts used, not generic advice.
Be hopeful — acknowledge progress and always close with actionable, forward-looking guidance.`;

    const userMessage = `<child_profile>
Name: ${child.display_name}
Age group: ${child.age_group}
Known triggers: ${((child.known_triggers as string[]) || []).join(", ") || "none listed"}
</child_profile>

<parent_style>
Parenting style: ${parentingStyle}
Values: ${parentingValues}
Note: forward-looking suggestions in paragraph 4 must align with this style and these values.
</parent_style>

<sessions>
Last 30 days — ${incidents.length} session(s), most recent first:

${sessionsText}
</sessions>

Write a narrative summary of 3–5 paragraphs covering:
1. Most recurring problem categories and patterns observed.
2. Advice that was consistently marked "helpful" — reference the specific scripts that worked.
3. Advice marked "misaligned" and what the reason tags suggest about fit.
4. 2–3 actionable, style-aligned suggestions for the coming weeks (must fit a ${parentingStyle} parenting approach).`;

    // ── LangSmith: open trace run (fire-and-forget) ──
    const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");
    const langsmithRunId = crypto.randomUUID();
    if (LANGSMITH_API_KEY) {
      fetch("https://api.smith.langchain.com/runs", {
        method: "POST",
        headers: { "x-api-key": LANGSMITH_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: langsmithRunId,
          name: "child-history-summary",
          run_type: "chain",
          inputs: { child_id, age_group: child.age_group, session_count: incidents.length },
          start_time: new Date().toISOString(),
        }),
      }).catch((err) => console.warn("LangSmith open error:", err));
    }

    // Call Gemini via Lovable Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summaryText = aiData.choices?.[0]?.message?.content || "Could not generate summary.";

    // ── LangSmith: close trace run with outputs (fire-and-forget) ──
    if (LANGSMITH_API_KEY) {
      fetch(`https://api.smith.langchain.com/runs/${langsmithRunId}`, {
        method: "PATCH",
        headers: { "x-api-key": LANGSMITH_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          outputs: { summary_length: summaryText.length, session_count: incidents.length },
          end_time: new Date().toISOString(),
        }),
      }).catch((err) => console.warn("LangSmith patch error:", err));
    }

    // Persist to cache
    const { data: saved } = await supabase
      .from("child_history_summaries")
      .insert({
        child_id,
        user_id: user.id,
        summary_text: summaryText,
        window_days: 30,
      })
      .select("generated_at")
      .single();

    return new Response(JSON.stringify({
      summary_text: summaryText,
      generated_at: saved?.generated_at || new Date().toISOString(),
      cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("child-history-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
