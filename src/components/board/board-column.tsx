"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { BoardCard } from "./board-card";
import type { CalendarItem, ItemStatus, BoardColumnConfig } from "@/types";

interface BoardColumnProps {
  column: BoardColumnConfig;
  items: CalendarItem[];
  courseKey: string;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (item: CalendarItem) => void;
  onConfirmSuggestion?: (item: CalendarItem & { _suggested?: boolean }) => void;
  suggestions?: Map<string, string>;
  onStartFocus?: (id: string, title: string) => void;
}

const COLUMN_HEADER_COLORS: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
};

export function BoardColumn({
  column,
  items,
  courseKey,
  onStatusChange,
  onDelete,
  onEdit,
  onConfirmSuggestion,
  suggestions,
  onStartFocus,
}: BoardColumnProps) {
  const droppableId = `${courseKey}::${column.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 p-2 min-h-[80px] transition-colors",
        isOver && "bg-primary/5 border-primary/30"
      )}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className={cn(
            "text-xs font-semibold rounded px-2 py-0.5",
            COLUMN_HEADER_COLORS[column.color]
          )}
        >
          {column.title}
        </span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <BoardCard
              key={item.id}
              item={item}
              isSuggested={!!suggestions?.has(item.id)}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onEdit={onEdit}
              onConfirmSuggestion={onConfirmSuggestion}
              onStartFocus={onStartFocus}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
