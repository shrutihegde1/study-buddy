"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
}

export function BoardSwimlane({
  courseName,
  items,
  onStatusChange,
  onDelete,
  onEdit,
  onConfirmSuggestion,
  suggestions,
}: BoardSwimlaneProps) {
  const [collapsed, setCollapsed] = useState(false);

  const itemsByStatus = (status: ItemStatus) =>
    items.filter((i) => i.status === status);

  return (
    <div className="border rounded-lg bg-white">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="text-sm font-semibold">{courseName}</h3>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </button>

      {!collapsed && (
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
