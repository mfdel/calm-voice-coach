import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChildProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["child_profiles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_profiles")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSingleChildProfile(childId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["child_profile", childId],
    enabled: !!user && !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_profiles")
        .select("*")
        .eq("id", childId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAddChild() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (child: { display_name: string; age_group: string; birth_date?: string; known_triggers?: string[]; calming_preferences?: string[] }) => {
      const { data, error } = await supabase
        .from("child_profiles")
        .insert({ ...child, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child_profiles"] }),
  });
}

export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      display_name?: string;
      age_group?: string;
      known_triggers?: string[];
      calming_preferences?: string[];
      development_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("child_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["child_profiles"] });
      qc.invalidateQueries({ queryKey: ["child_profile", data.id] });
    },
  });
}

export function useRedLines() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["red_lines", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("red_lines").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleRedLine() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ code, label, severity, isActive }: { code: string; label: string; severity: string; isActive: boolean }) => {
      if (isActive) {
        const { error } = await supabase.from("red_lines").delete().eq("code", code).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("red_lines").insert({ user_id: user!.id, code, label, severity });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["red_lines"] }),
  });
}

export function useParentingPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["parenting_preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parenting_preferences")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertPreferences() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (prefs: { style?: string; parenting_values?: string[]; tone_preferences?: string[] }) => {
      const { data, error } = await supabase
        .from("parenting_preferences")
        .upsert({ user_id: user!.id, ...prefs }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parenting_preferences"] }),
  });
}
