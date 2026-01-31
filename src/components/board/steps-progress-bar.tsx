"use client";

import { getStepsProgress } from "@/lib/board-utils";
import type { Step } from "@/types";

interface StepsProgressBarProps {
  steps: Step[];
}

export function StepsProgressBar({ steps }: StepsProgressBarProps) {
  const { done, total } = getStepsProgress(steps);
  if (total === 0) return null;

  const percent = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  );
}
