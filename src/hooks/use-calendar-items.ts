"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CalendarItem, CreateCalendarItemInput, UpdateCalendarItemInput } from "@/types";

export function useCalendarItems() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["calendar-items"],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as CalendarItem[];
    },
    enabled: mounted,
  });

  const createItemMutation = useMutation({
    mutationFn: async (input: CreateCalendarItemInput) => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("calendar_items")
        .insert({
          ...input,
          user_id: user.id,
          source: input.source || "manual",
        })
        .select()
        .single();

      if (error) throw error;
      return data as CalendarItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-items"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCalendarItemInput & { id: string }) => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("calendar_items")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CalendarItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-items"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("calendar_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-items"] });
    },
  });

  const toggleComplete = async (id: string, completed: boolean) => {
    await updateItemMutation.mutateAsync({
      id,
      status: completed ? "completed" : "pending",
      completed_at: completed ? new Date().toISOString() : null,
    });
  };

  return {
    items,
    isLoading: !mounted || isLoading,
    error,
    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    toggleComplete,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
}
