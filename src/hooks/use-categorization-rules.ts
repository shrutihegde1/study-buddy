"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategorizationRule } from "@/types";

export function useCategorizationRules() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: rules = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categorization-rules"],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("categorization_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CategorizationRule[];
    },
    enabled: mounted,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (input: {
      match_type: CategorizationRule["match_type"];
      match_value: string;
      course_name: string;
      auto_generated?: boolean;
    }) => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("categorization_rules")
        .upsert(
          {
            user_id: user.id,
            match_type: input.match_type,
            match_value: input.match_value,
            course_name: input.course_name,
            auto_generated: input.auto_generated ?? false,
          },
          {
            onConflict: "user_id,match_type,match_value",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CategorizationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("categorization_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });
    },
  });

  return {
    rules,
    isLoading: !mounted || isLoading,
    error,
    createRule: createRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
    isCreatingRule: createRuleMutation.isPending,
    isDeletingRule: deleteRuleMutation.isPending,
  };
}
