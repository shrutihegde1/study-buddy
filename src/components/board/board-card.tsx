"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { GripVertical, CalendarIcon, Check } from "lucide-react";
import { isOverdue } from "@/lib/board-utils";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";
import { extractTaskTheme, getThemeColor } from "@/lib/task-themes";
import { EffortBadge } from "./effort-badge";
import { StepsProgressBar } from "./steps-progress-bar";
import { BoardCardActions } from "./board-card-actions";
import type { CalendarItem, ItemStatus } from "@/types";

interface BoardCardProps {
  item: CalendarItem & { _suggested?: boolean };
  isSuggested?: boolean;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (item: CalendarItem) => void;
  onConfirmSuggestion?: (item: CalendarItem & { _suggested?: boolean }) => void;
  onStartFocus?: (id: string, title: string) => void;
}

export function BoardCard({
  item,
  isSuggested,
  onStatusChange,
  onDelete,
  onEdit,
  onConfirmSuggestion,
  onStartFocus,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(item);
  const showSuggested = isSuggested && item._suggested;
  const theme = extractTaskTheme(item.title);
  const badgeLabel = theme ?? ITEM_TYPE_LABELS[item.item_type];
  const badgeColor = theme ? getThemeColor(theme) : ITEM_TYPE_COLORS[item.item_type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-white p-3 shadow-sm cursor-default",
        "hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg",
        overdue && "border-red-300 bg-red-50/50",
        showSuggested && "border-dashed border-amber-400"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <button
            className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            className="text-sm font-medium text-left truncate hover:underline"
            onClick={() => onEdit(item)}
          >
            {item.title}
          </button>
        </div>
        <BoardCardActions
          item={item}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onStartFocus={onStartFocus}
        />
      </div>

      {showSuggested && (
        <div className="mt-1.5 ml-5.5 flex items-center gap-1.5">
          <span className="text-[10px] text-amber-600 font-medium">
            suggested
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirmSuggestion?.(item);
            }}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
          >
            <Check className="h-3 w-3" />
            Confirm
          </button>
        </div>
      )}

      <div className="mt-2 ml-5.5 flex flex-wrap items-center gap-1.5">
        {item.due_date && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              overdue ? "text-red-600 font-medium" : "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(item.due_date), "MMM d")}
          </span>
        )}
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {badgeLabel}
        </span>
        {item.effort_estimate && (
          <EffortBadge effort={item.effort_estimate} />
        )}
      </div>

      {item.steps && item.steps.length > 0 && (
        <div className="mt-2 ml-5.5">
          <StepsProgressBar steps={item.steps} />
        </div>
      )}
    </div>
  );
}
