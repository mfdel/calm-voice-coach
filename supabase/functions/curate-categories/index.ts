import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default categories for new users or children with no history
const DEFAULT_CATEGORIES = [
  { code: "bedtime_resistance", label: "Bedtime resistance", emoji: "🌙" },
  { code: "meal_refusal", label: "Won't eat / food refusal", emoji: "🍽️" },
  { code: "transition_meltdown", label: "Transition meltdown", emoji: "🔄" },
  { code: "hitting_aggression", label: "Hitting / aggression", emoji: "✋" },
];

// Full category map for lookups
const CATEGORY_MAP: Record<string, { label: string; emoji: string }> = {
  bedtime_resistance: { label: "Bedtime resistance", emoji: "🌙" },
  meal_refusal: { label: "Won't eat / food refusal", emoji: "🍽️" },
  morning_routine: { label: "Morning routine meltdown", emoji: "☀️" },
  sibling_conflict: { label: "Sibling conflict", emoji: "👫" },
  transition_meltdown: { label: "Transition meltdown", emoji: "🔄" },
  dressing_refusal: { label: "Refuses to get dressed", emoji: "👕" },
  public_tantrum: { label: "Public tantrum", emoji: "🏪" },
  screen_time_battle: { label: "Screen time battle", emoji: "📱" },
  homework_resistance: { label: "Homework resistance", emoji: "📚" },
  bath_time_refusal: { label: "Bath time refusal", emoji: "🛁" },
  sharing_conflict: { label: "Won't share", emoji: "🧸" },
  separation_anxiety: { label: "Separation anxiety", emoji: "😢" },
  hitting_aggression: { label: "Hitting / aggression", emoji: "✋" },
  whining_crying: { label: "Constant whining / crying", emoji: "😭" },
  cleanup_refusal: { label: "Won't clean up", emoji: "🧹" },
};

// Trigger-to-category affinity: which categories are likely given certain triggers
const TRIGGER_CATEGORY_AFFINITY: Record<string, string[]> = {
  transitions: ["transition_meltdown", "morning_routine", "dressing_refusal"],
  fatigue: ["bedtime_resistance", "whining_crying", "morning_routine"],
  hunger: ["meal_refusal", "whining_crying"],
  "loud noises": ["public_tantrum", "separation_anxiety"],
  "new environments": ["public_tantrum", "separation_anxiety"],
  "sharing toys": ["sharing_conflict", "sibling_conflict"],
  "schedule changes": ["transition_meltdown", "morning_routine"],
  "sensory overload": ["public_tantrum", "bath_time_refusal"],
  "sibling conflict": ["sibling_conflict", "hitting_aggression", "sharing_conflict"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = claimsData.claims.sub as string;

    // Use service role for DB operations (needs to read all child_profiles)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Support single-child mode (triggered after SOS) or batch mode
    const body = await req.json().catch(() => ({}));
    const targetChildId = body.child_id;
    // Always scope to the authenticated user — ignore any user_id from the body
    const targetUserId = authenticatedUserId;

    let query = supabase
      .from("child_profiles")
      .select("id, user_id, known_triggers, age_group");

    if (targetUserId && targetChildId) {
      query = query.eq("user_id", targetUserId).eq("id", targetChildId);
    }

    const { data: children } = await query;

    if (!children || children.length === 0) {
      return new Response(JSON.stringify({ message: "No children to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const child of children) {
      const scores: Record<string, number> = {};

      // Initialize all categories with base score
      for (const code of Object.keys(CATEGORY_MAP)) {
        scores[code] = 0;
      }

      // Factor 1: Incident frequency (last 30 days) — strongest signal
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: incidents } = await supabase
        .from("incidents")
        .select("problem_category, incident_feedback(outcome)")
        .eq("user_id", child.user_id)
        .eq("child_id", child.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (incidents) {
        for (const inc of incidents) {
          const cat = inc.problem_category;
          if (scores[cat] !== undefined) {
            scores[cat] += 2.0; // base frequency boost
            // Boost more if previously misaligned (parent needs more help here)
            const feedback = inc.incident_feedback as any;
            if (feedback?.outcome === "misaligned") {
              scores[cat] += 1.0;
            }
          }
        }
      }

      // Factor 2: Child trigger affinity
      const triggers = (child.known_triggers as string[]) || [];
      for (const trigger of triggers) {
        const normalizedTrigger = trigger.toLowerCase();
        const affinities = TRIGGER_CATEGORY_AFFINITY[normalizedTrigger] || [];
        for (const cat of affinities) {
          if (scores[cat] !== undefined) {
            scores[cat] += 1.0;
          }
        }
      }

      // Factor 3: Age-appropriate defaults
      const ageDefaults: Record<string, string[]> = {
        infant: ["whining_crying", "separation_anxiety", "meal_refusal", "bath_time_refusal"],
        toddler: ["transition_meltdown", "meal_refusal", "bedtime_resistance", "hitting_aggression"],
        preschool: ["sibling_conflict", "sharing_conflict", "dressing_refusal", "bedtime_resistance"],
        school_age: ["homework_resistance", "screen_time_battle", "sibling_conflict", "morning_routine"],
      };
      const ageCategories = ageDefaults[child.age_group] || ageDefaults.toddler;
      for (const cat of ageCategories) {
        scores[cat] += 0.5;
      }

      // Sort and pick top 4
      const sorted = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4);

      const topCategories = sorted.map(([code]) => ({
        code,
        label: CATEGORY_MAP[code]?.label || code,
        emoji: CATEGORY_MAP[code]?.emoji || "❓",
      }));

      // If no meaningful scores, use defaults
      const finalCategories = sorted[0][1] > 0 ? topCategories : DEFAULT_CATEGORIES;

      // Upsert curated categories
      await supabase
        .from("curated_categories")
        .upsert({
          user_id: child.user_id,
          child_id: child.id,
          categories: finalCategories,
          computed_at: new Date().toISOString(),
        }, { onConflict: "user_id,child_id" });

      processed++;
    }

    return new Response(JSON.stringify({ message: `Processed ${processed} children` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Curate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
