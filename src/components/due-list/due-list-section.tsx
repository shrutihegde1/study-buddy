"use client";

import { useState } from "react";
import { cn, stripHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Timer,
  Clock,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay, addDays } from "date-fns";
import { parseDueDate } from "@/lib/board-utils";
import { ITEM_TYPE_LABELS, ITEM_SOURCE_LABELS } from "@/lib/constants";
import type { CalendarItem } from "@/types";

interface DueListSectionProps {
  title: string;
  items: CalendarItem[];
  variant?: "overdue" | "today" | "completed" | "default";
  onToggleComplete?: (id: string, completed: boolean) => void;
  onStart?: (item: CalendarItem) => Promise<void>;
  onStartWithFocus?: (item: CalendarItem) => Promise<void>;
  onSnooze?: (item: CalendarItem) => Promise<void>;
  onDismiss?: (item: CalendarItem) => Promise<void>;
  onCloseOldItems?: (items: CalendarItem[]) => Promise<void>;
  defaultCollapsed?: boolean;
}

export function DueListSection({
  title,
  items,
  variant = "default",
  onToggleComplete,
  onStart,
  onStartWithFocus,
  onSnooze,
  onDismiss,
  onCloseOldItems,
  defaultCollapsed = false,
}: DueListSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [closeOlderThanWeeks, setCloseOlderThanWeeks] = useState(4);
  const [isClosingOld, setIsClosingOld] = useState(false);

  const headerColor = {
    overdue: "text-red-600",
    today: "text-blue-600",
    completed: "text-gray-500",
    default: "text-gray-900",
  }[variant];

  const isOverdue = variant === "overdue";
  const isCompleted = variant === "completed";
  const showActionButtons = !isCompleted && !!onStart && !!onStartWithFocus;

  const handleCloseOldItems = async () => {
    if (!onCloseOldItems) return;
    setIsClosingOld(true);
    try {
      const cutoffDate = addDays(startOfDay(new Date()), -closeOlderThanWeeks * 7);
      const oldItems = items.filter(
        (item) => item.due_date && isBefore(parseDueDate(item.due_date), cutoffDate)
      );
      await onCloseOldItems(oldItems);
    } finally {
      setIsClosingOld(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
          <h2 className={cn("font-semibold", headerColor)}>{title}</h2>
          <span className="text-sm text-gray-500">({items.length})</span>
        </button>

        {isOverdue && items.length > 0 && onCloseOldItems && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Close older than</span>
            <select
              value={closeOlderThanWeeks}
              onChange={(e) => setCloseOlderThanWeeks(Number(e.target.value))}
              className="h-8 px-2 text-xs border rounded-md bg-white"
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={3}>3 weeks</option>
              <option value={4}>4 weeks</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseOldItems}
              disabled={isClosingOld}
              className="h-8 text-xs"
            >
              {isClosingOld ? "Closing..." : "Close"}
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="divide-y">
          {items.map((item) => (
            <DueListItem
              key={item.id}
              item={item}
              variant={variant}
              onToggleComplete={onToggleComplete}
              onStart={onStart}
              onStartWithFocus={onStartWithFocus}
              onSnooze={onSnooze}
              onDismiss={onDismiss}
              showActionButtons={showActionButtons}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DueListItemProps {
  item: CalendarItem;
  variant?: "overdue" | "today" | "completed" | "default";
  onToggleComplete?: (id: string, completed: boolean) => void;
  onStart?: (item: CalendarItem) => Promise<void>;
  onStartWithFocus?: (item: CalendarItem) => Promise<void>;
  onSnooze?: (item: CalendarItem) => Promise<void>;
  onDismiss?: (item: CalendarItem) => Promise<void>;
  showActionButtons?: boolean;
}

function DueListItem({
  item,
  variant = "default",
  onToggleComplete,
  onStart,
  onStartWithFocus,
  onSnooze,
  onDismiss,
  showActionButtons,
}: DueListItemProps) {
  const isCompleted = item.status === "completed";
  const isCompletedVariant = variant === "completed";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors",
        isCompleted && "opacity-60"
      )}
    >
      {/* Show checkbox only for completed variant or when action buttons are not available */}
      {(isCompletedVariant || !showActionButtons) && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) =>
            onToggleComplete?.(item.id, checked as boolean)
          }
          className="mt-1"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "font-medium text-gray-900",
              isCompleted && "line-through"
            )}
          >
            {item.title}
          </h3>
          <Badge variant={item.item_type as "assignment" | "test" | "quiz" | "activity" | "task"}>
            {ITEM_TYPE_LABELS[item.item_type]}
          </Badge>
        </div>

        {item.course_name && (
          <p className="text-sm text-gray-600 mt-0.5">{item.course_name}</p>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {item.due_date && (
            <span>
              Due: {format(parseISO(item.due_date), "MMM d, yyyy 'at' h:mm a")}
            </span>
          )}
          <span>{ITEM_SOURCE_LABELS[item.source]}</span>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {item.description && stripHtml(item.description) && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {stripHtml(item.description)}
          </p>
        )}
      </div>

      {/* CTA buttons for non-completed items */}
      {showActionButtons && !isCompletedVariant && (
        <div className="flex gap-1 shrink-0 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStart?.(item)}
            className="h-8 w-8 p-0"
            title="Start working on this task"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStartWithFocus?.(item)}
            className="h-8 w-8 p-0"
            title="Start with 30-min focus timer"
          >
            <Timer className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSnooze?.(item)}
            className="h-8 w-8 p-0"
            title="Snooze for 1 week"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDismiss?.(item)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:border-red-200"
            title="Dismiss — this task won't appear again"
          >
            <Ban className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleComplete?.(item.id, true)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 hover:border-green-200"
            title="Mark as complete"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
