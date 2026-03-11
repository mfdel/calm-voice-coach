import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents_today"] }),
  });
}
