"use client";

import { useMemo } from "react";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { useFocusTimer } from "@/components/focus-timer/focus-timer-context";
import { DueListSection } from "./due-list-section";
import { isToday, isThisWeek, isBefore, startOfDay, addDays } from "date-fns";
import { parseDueDate } from "@/lib/board-utils";
import type { CalendarItem } from "@/types";

export function DueListView() {
  const { items, isLoading, toggleComplete, updateItem } = useCalendarItems();
  const { isHidden } = useHiddenSubjects();
  const { startFocusTimer } = useFocusTimer();

  const handleStart = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "in_progress" });
  };

  const handleStartWithFocus = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "in_progress" });
    startFocusTimer(item.id, item.title);
  };

  const handleSnooze = async (item: CalendarItem) => {
    const nextWeek = addDays(startOfDay(new Date()), 7);
    await updateItem({ id: item.id, due_date: nextWeek.toISOString() });
  };

  const handleDismiss = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "cancelled" });
  };

  const handleCloseOldItems = async (items: CalendarItem[]) => {
    for (const item of items) {
      await updateItem({ id: item.id, status: "cancelled" });
    }
  };

  const filteredItems = useMemo(
    () => items.filter((item) => !isHidden(item.course_name ?? "")),
    [items, isHidden]
  );

  const sections = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    const overdue: CalendarItem[] = [];
    const today: CalendarItem[] = [];
    const thisWeek: CalendarItem[] = [];
    const later: CalendarItem[] = [];
    const completed: CalendarItem[] = [];

    filteredItems.forEach((item) => {
      // Skip cancelled items entirely
      if (item.status === "cancelled") {
        return;
      }

      if (item.status === "completed") {
        completed.push(item);
        return;
      }

      const dueDate = item.due_date ? parseDueDate(item.due_date) : null;
      if (!dueDate) {
        later.push(item);
        return;
      }

      const todayMidnight = startOfDay(new Date());
      if (isBefore(dueDate, todayMidnight)) {
        // Only assignments and user tasks are actionable when overdue
        if (item.item_type === "assignment" || item.item_type === "task") {
          overdue.push(item);
        }
      } else if (isToday(dueDate)) {
        today.push(item);
      } else if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
        thisWeek.push(item);
      } else {
        later.push(item);
      }
    });

    // Sort each section by due date
    const sortByDueDate = (a: CalendarItem, b: CalendarItem) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    };

    return {
      overdue: overdue.sort(sortByDueDate),
      today: today.sort(sortByDueDate),
      thisWeek: thisWeek.sort(sortByDueDate),
      later: later.sort(sortByDueDate),
      completed: completed.sort(
        (a, b) =>
          new Date(b.completed_at || 0).getTime() -
          new Date(a.completed_at || 0).getTime()
      ),
    };
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isEmpty =
    sections.overdue.length === 0 &&
    sections.today.length === 0 &&
    sections.thisWeek.length === 0 &&
    sections.later.length === 0 &&
    sections.completed.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No items</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding your first item or syncing with your accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.overdue.length > 0 && (
        <DueListSection
          title="Overdue"
          items={sections.overdue}
          variant="overdue"
          onToggleComplete={toggleComplete}
          onStart={handleStart}
          onStartWithFocus={handleStartWithFocus}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
          onCloseOldItems={handleCloseOldItems}
        />
      )}

      {sections.today.length > 0 && (
        <DueListSection
          title="Today"
          items={sections.today}
          variant="today"
          onToggleComplete={toggleComplete}
          onStart={handleStart}
          onStartWithFocus={handleStartWithFocus}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
        />
      )}

      {sections.thisWeek.length > 0 && (
        <DueListSection
          title="This Week"
          items={sections.thisWeek}
          onToggleComplete={toggleComplete}
          onStart={handleStart}
          onStartWithFocus={handleStartWithFocus}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
        />
      )}

      {sections.later.length > 0 && (
        <DueListSection
          title="Later"
          items={sections.later}
          onToggleComplete={toggleComplete}
          onStart={handleStart}
          onStartWithFocus={handleStartWithFocus}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
        />
      )}

      {sections.completed.length > 0 && (
        <DueListSection
          title="Completed"
          items={sections.completed}
          variant="completed"
          onToggleComplete={toggleComplete}
          defaultCollapsed
        />
      )}
    </div>
  );
}
