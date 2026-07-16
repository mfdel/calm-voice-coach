import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_incident",
  title: "Get incident details",
  description: "Fetch a single incident with its coaching suggestions and any parent feedback.",
  inputSchema: {
    incident_id: z.string().uuid().describe("The incident's UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ incident_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data: incident, error } = await sb
      .from("incidents")
      .select("id, child_id, problem_category, note_text, summary_text, created_at")
      .eq("id", incident_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!incident) return { content: [{ type: "text", text: "Incident not found" }], isError: true };

    const [{ data: suggestions }, { data: feedback }] = await Promise.all([
      sb.from("incident_suggestions").select("position, title, reason, script, source_type").eq("incident_id", incident_id).order("position"),
      sb.from("incident_feedback").select("outcome, note, created_at").eq("incident_id", incident_id).maybeSingle(),
    ]);

    const payload = { incident, suggestions: suggestions ?? [], feedback: feedback ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
