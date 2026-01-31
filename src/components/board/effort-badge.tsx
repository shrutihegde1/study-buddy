"use client";

import { cn } from "@/lib/utils";
import { EFFORT_COLORS } from "@/lib/constants";
import type { EffortEstimate } from "@/types";

interface EffortBadgeProps {
  effort: EffortEstimate;
}

export function EffortBadge({ effort }: EffortBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        EFFORT_COLORS[effort]
      )}
    >
      {effort}
    </span>
  );
}
