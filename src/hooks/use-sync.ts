"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type SyncSource = "classroom" | "canvas" | "canvas-calendar" | "gmail" | "all";

interface SyncResult {
  success: boolean;
  itemsSynced?: number;
  error?: string;
}

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState<Record<string, SyncResult>>({});
  const queryClient = useQueryClient();

  const syncSource = useCallback(
    async (source: Exclude<SyncSource, "all">): Promise<SyncResult> => {
      try {
        const response = await fetch(`/api/sync/${source}`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || `Failed to sync ${source}`,
          };
        }

        return {
          success: true,
          itemsSynced: data.itemsSynced,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : `Failed to sync ${source}`,
        };
      }
    },
    []
  );

  const syncCanvas = useCallback(async (): Promise<SyncResult> => {
    // Try API token first, then calendar URL
    const apiResult = await syncSource("canvas");
    if (apiResult.success) {
      return apiResult;
    }

    // If API sync failed (likely not configured), try calendar URL
    const calendarResult = await syncSource("canvas-calendar");
    return calendarResult;
  }, [syncSource]);

  const sync = useCallback(
    async (source: SyncSource = "all") => {
      setIsSyncing(true);
      const results: Record<string, SyncResult> = {};

      try {
        if (source === "all") {
          // Sync all sources in parallel
          const [classroomResult, canvasResult, gmailResult] = await Promise.all([
            syncSource("classroom"),
            syncCanvas(),
            syncSource("gmail"),
          ]);

          results.classroom = classroomResult;
          results.canvas = canvasResult;
          results.gmail = gmailResult;
        } else if (source === "canvas") {
          results[source] = await syncCanvas();
        } else {
          results[source] = await syncSource(source);
        }

        setLastSyncResults(results);

        // Refresh calendar items
        await queryClient.invalidateQueries({ queryKey: ["calendar-items"] });

        return results;
      } finally {
        setIsSyncing(false);
      }
    },
    [syncSource, syncCanvas, queryClient]
  );

  return {
    sync,
    isSyncing,
    lastSyncResults,
  };
}
