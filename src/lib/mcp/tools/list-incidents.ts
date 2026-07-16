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
  name: "list_incidents",
  title: "List recent incidents",
  description: "List recent SOS incidents for the signed-in parent, optionally filtered by child or problem category.",
  inputSchema: {
    child_id: z.string().uuid().nullable().describe("Filter to a specific child. Pass null for all children."),
    problem_category: z.string().nullable().describe("Filter to a specific problem category (e.g. bedtime_resistance). Pass null for all."),
    limit: z.number().int().min(1).max(50).describe("Maximum incidents to return (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ child_id, problem_category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("incidents")
      .select("id, child_id, problem_category, note_text, summary_text, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (child_id) q = q.eq("child_id", child_id);
    if (problem_category) q = q.eq("problem_category", problem_category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { incidents: data ?? [] },
    };
  },
});
