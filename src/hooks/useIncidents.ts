import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChildHistorySummary(childId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["child_history_summary", childId],
    enabled: !!user && !!childId,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("child-history-summary", {
        body: { child_id: childId },
      });
      if (error) throw error;
      return data as { summary_text: string; generated_at: string; cached: boolean };
    },
  });
}

export function useTodayIncidents() {
  const { user } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ["incidents_today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          incident_suggestions(*),
          incident_feedback(*)
        `)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIncidentsByDateRange(startDate: Date, endDate?: Date, childId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["incidents_range", user?.id, startDate.toISOString(), endDate?.toISOString(), childId],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("incidents")
        .select(`
          *,
          incident_suggestions(*),
          incident_feedback(*),
          child_profiles(display_name)
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }
      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMonthlyIncidentsSummary(childId?: string | null) {
  const { user } = useAuth();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ["incidents_monthly", user?.id, childId],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("incidents")
        .select(`
          *,
          incident_suggestions(*),
          incident_feedback(*)
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const incidents = data || [];
      const totalSessions = incidents.length;

      const categoryCounts: Record<string, number> = {};
      for (const inc of incidents) {
        categoryCounts[inc.problem_category] = (categoryCounts[inc.problem_category] || 0) + 1;
      }
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const withFeedback = incidents.filter((i: any) => i.incident_feedback != null);
      const feedbackCount = withFeedback.length;
      const helpfulCount = withFeedback.filter((i: any) => i.incident_feedback?.outcome === "helpful").length;
      const alignmentPct = feedbackCount > 0 ? Math.round((helpfulCount / feedbackCount) * 100) : null;

      return { totalSessions, topCategories, feedbackCount, helpfulCount, alignmentPct };
    },
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ incident_id, outcome, reason_tags, feedback_note }: {
      incident_id: string;
      outcome: string;
      reason_tags?: string[];
      feedback_note?: string;
    }) => {
      const { data, error } = await supabase
        .from("incident_feedback")
        .upsert(
          { incident_id, outcome, reason_tags: reason_tags || [], feedback_note },
          { onConflict: "incident_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents_today"] });
      qc.invalidateQueries({ queryKey: ["incidents_range"] });
      qc.invalidateQueries({ queryKey: ["incidents_monthly"] });
    },
  });
}
