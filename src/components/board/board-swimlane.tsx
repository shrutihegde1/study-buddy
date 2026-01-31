"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOARD_COLUMNS } from "@/lib/constants";
import { BoardColumn } from "./board-column";
import type { CalendarItem, ItemStatus } from "@/types";

interface BoardSwimlaneProps {
  courseName: string;
  items: CalendarItem[];
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (item: CalendarItem) => void;
  onConfirmSuggestion?: (item: CalendarItem & { _suggested?: boolean }) => void;
  suggestions?: Map<string, string>;
  isHidden?: boolean;
  onToggleVisibility?: (courseName: string) => void;
}

export function BoardSwimlane({
  courseName,
  items,
  onStatusChange,
  onDelete,
  onEdit,
  onConfirmSuggestion,
  suggestions,
  isHidden,
  onToggleVisibility,
}: BoardSwimlaneProps) {
  const [collapsed, setCollapsed] = useState(false);

  const itemsByStatus = (status: ItemStatus) =>
    items.filter((i) => i.status === status);

  const showBody = !collapsed && !isHidden;

  return (
    <div className={cn("border rounded-lg bg-white", isHidden && "opacity-50")}>
      <div className="flex items-center w-full px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 flex-1 text-left hover:bg-muted/50 transition-colors rounded-md -ml-1 pl-1"
        >
          {collapsed || isHidden ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold">{courseName}</h3>
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </button>

        {onToggleVisibility && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(courseName);
            }}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            aria-label={isHidden ? `Show ${courseName}` : `Hide ${courseName}`}
          >
            {isHidden ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {showBody && (
        <div
          className={cn(
            "grid grid-cols-4 gap-3 px-4 pb-4",
            "max-[768px]:grid-cols-2 max-[640px]:grid-cols-1"
          )}
        >
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              items={itemsByStatus(col.id)}
              courseKey={courseName}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onEdit={onEdit}
              onConfirmSuggestion={onConfirmSuggestion}
              suggestions={suggestions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
