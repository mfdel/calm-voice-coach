import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LANGSMITH_API_KEY = Deno.env.get("LANGSMITH_API_KEY");
    if (!LANGSMITH_API_KEY) {
      // Silently succeed — LangSmith not configured is not an error
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate caller is authenticated
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { incident_id, outcome, reason_tags } = await req.json();

    // Look up the langsmith_run_id for this incident — verifies the incident belongs
    // to this user via the RLS policy on prompt_runs (which joins through incidents).
    const { data: promptRun } = await supabase
      .from("prompt_runs")
      .select("langsmith_run_id")
      .eq("incident_id", incident_id)
      .single();

    const langsmithRunId = promptRun?.langsmith_run_id;
    if (!langsmithRunId) {
      // No run ID stored — nothing to push
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push the parent's rating to LangSmith as a feedback score
    const lsRes = await fetch("https://api.smith.langchain.com/feedback", {
      method: "POST",
      headers: { "x-api-key": LANGSMITH_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: langsmithRunId,
        key: "parent_rating",
        score: outcome === "helpful" ? 1 : 0,
        comment: Array.isArray(reason_tags) && reason_tags.length > 0
          ? reason_tags.join(", ")
          : outcome,
      }),
    });

    if (!lsRes.ok) {
      console.warn("LangSmith feedback push failed:", lsRes.status);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("langsmith-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
