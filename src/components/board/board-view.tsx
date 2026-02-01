"use client";

import { useState, useCallback, useMemo } from "react";
import { startOfDay } from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useCategorizationRules } from "@/hooks/use-categorization-rules";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { groupByCourse, groupByDueDate } from "@/lib/board-utils";
import { categorizeItems } from "@/lib/categorization";
import { BoardSwimlane } from "./board-swimlane";
import { BoardEmptyState } from "./board-empty-state";
import { BoardCard } from "./board-card";
import { ItemModal } from "@/components/items/item-modal";
import type { CalendarItem, ItemStatus, BoardViewMode } from "@/types";

interface BoardViewProps {
  viewMode?: BoardViewMode;
}

export function BoardView({ viewMode = "by_course" }: BoardViewProps) {
  const { items, isLoading, updateItem, deleteItem } = useCalendarItems();
  const { rules, createRule } = useCategorizationRules();
  const { isHidden, toggleSubject } = useHiddenSubjects();
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [editItem, setEditItem] = useState<CalendarItem | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Compute categorization suggestions for uncategorized items
  const suggestions = useMemo(
    () => categorizeItems(items, rules),
    [items, rules]
  );

  // Enrich items with suggested course_name and _suggested flag
  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      const suggested = suggestions.get(item.id);
      if (suggested && !item.course_name) {
        return {
          ...item,
          course_name: suggested,
          _suggested: true,
        } as CalendarItem & { _suggested?: boolean };
      }
      return item as CalendarItem & { _suggested?: boolean };
    });
  }, [items, suggestions]);

  const handleStatusChange = useCallback(
    async (id: string, status: ItemStatus) => {
      await updateItem({
        id,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      });
    },
    [updateItem]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem(id);
    },
    [deleteItem]
  );

  const handleEdit = useCallback((item: CalendarItem) => {
    setEditItem(item);
    setModalOpen(true);
  }, []);

  const handleConfirmSuggestion = useCallback(
    async (item: CalendarItem & { _suggested?: boolean }) => {
      if (!item._suggested || !item.course_name) return;

      // Persist the suggested course_name
      await updateItem({
        id: item.id,
        course_name: item.course_name,
      });

      // Create a rule so future items auto-categorize
      // Extract the most distinctive keyword from the title (longest word > 3 chars)
      const words = item.title
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort((a, b) => b.length - a.length);
      const keyword = words[0];
      if (keyword) {
        try {
          await createRule({
            match_type: "title_contains",
            match_value: keyword.toLowerCase(),
            course_name: item.course_name,
          });
        } catch {
          // Rule creation is best-effort; ignore duplicates
        }
      }
    },
    [updateItem, createRule]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as CalendarItem | undefined;
    if (item) setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    // Droppable IDs are formatted as "courseName::status"
    const sepIndex = overId.lastIndexOf("::");
    if (sepIndex === -1) return;

    const targetStatus = overId.slice(sepIndex + 2) as ItemStatus;
    const draggedItem = active.data.current?.item as CalendarItem | undefined;

    if (draggedItem && draggedItem.status !== targetStatus) {
      handleStatusChange(draggedItem.id, targetStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return <BoardEmptyState />;
  }

  const visibleItems =
    viewMode === "this_week"
      ? enrichedItems.filter((item) => !isHidden(item.course_name ?? ""))
      : enrichedItems;

  // For "this_week": drop completed/cancelled items with past due dates
  const thisWeekItems =
    viewMode === "this_week"
      ? visibleItems.filter((item) => {
          if (!item.due_date) return true;
          const isPast = new Date(item.due_date) < startOfDay(new Date());
          const isDone = item.status === "completed" || item.status === "cancelled";
          return !(isPast && isDone);
        })
      : visibleItems;

  const grouped =
    viewMode === "this_week"
      ? groupByDueDate(thisWeekItems, 10)
      : groupByCourse(visibleItems);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {Object.entries(grouped).map(([groupName, groupItems]) => (
            <BoardSwimlane
              key={groupName}
              courseName={groupName}
              items={groupItems}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onConfirmSuggestion={handleConfirmSuggestion}
              suggestions={suggestions}
              {...(viewMode === "by_course" && {
                isHidden: isHidden(groupName),
                onToggleVisibility: toggleSubject,
              })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div className="w-64">
              <BoardCard
                item={activeItem}
                onStatusChange={() => {}}
                onDelete={() => {}}
                onEdit={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(undefined);
        }}
        item={editItem}
      />
    </>
  );
}
