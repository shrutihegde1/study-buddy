"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ITEM_TYPE_LABELS, ITEM_SOURCE_LABELS } from "@/lib/constants";
import type { CalendarItem } from "@/types";

interface DueListSectionProps {
  title: string;
  items: CalendarItem[];
  variant?: "overdue" | "today" | "completed" | "default";
  onToggleComplete?: (id: string, completed: boolean) => void;
  defaultCollapsed?: boolean;
}

export function DueListSection({
  title,
  items,
  variant = "default",
  onToggleComplete,
  defaultCollapsed = false,
}: DueListSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const headerColor = {
    overdue: "text-red-600",
    today: "text-blue-600",
    completed: "text-gray-500",
    default: "text-gray-900",
  }[variant];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
          <h2 className={cn("font-semibold", headerColor)}>{title}</h2>
          <span className="text-sm text-gray-500">({items.length})</span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y">
          {items.map((item) => (
            <DueListItem
              key={item.id}
              item={item}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DueListItemProps {
  item: CalendarItem;
  onToggleComplete?: (id: string, completed: boolean) => void;
}

function DueListItem({ item, onToggleComplete }: DueListItemProps) {
  const isCompleted = item.status === "completed";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors",
        isCompleted && "opacity-60"
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) =>
          onToggleComplete?.(item.id, checked as boolean)
        }
        className="mt-1"
      />

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

        {item.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
