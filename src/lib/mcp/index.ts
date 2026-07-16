import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listChildrenTool from "./tools/list-children";
import listIncidentsTool from "./tools/list-incidents";
import getIncidentTool from "./tools/get-incident";

// Construct the OAuth issuer from the Supabase project ref. Vite inlines
// VITE_SUPABASE_PROJECT_ID at build time so this stays import-safe (no runtime
// env read). Never derive the issuer from SUPABASE_URL — that may be a
// .lovable.cloud proxy the discovery document doesn't match.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "parentpilot-mcp",
  title: "ParentPilot",
  version: "0.1.0",
  instructions:
    "Tools for a ParentPilot parent. Use list_children to see the parent's kids, list_incidents to browse recent SOS sessions, and get_incident for the coaching suggestions and feedback on a specific incident. All tools are read-only and scoped to the signed-in parent.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listChildrenTool, listIncidentsTool, getIncidentTool],
});
