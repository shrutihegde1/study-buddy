import type { CalendarItem, Step } from "@/types";
import {
  isToday,
  isTomorrow,
  isBefore,
  startOfDay,
  addDays,
  format,
} from "date-fns";

export function isOverdue(item: CalendarItem): boolean {
  if (!item.due_date) return false;
  if (item.status === "completed" || item.status === "cancelled") return false;
  return new Date(item.due_date) < new Date();
}

export function groupByCourse(
  items: CalendarItem[]
): Record<string, CalendarItem[]> {
  const groups: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    const key = item.course_name || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  // Sort keys alphabetically, but keep "School Schedule" and "Uncategorized" last
  const sorted: Record<string, CalendarItem[]> = {};
  const tailKeys = ["School Schedule", "Uncategorized"];
  const keys = Object.keys(groups).sort((a, b) => {
    const aIdx = tailKeys.indexOf(a);
    const bIdx = tailKeys.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return 1;
    if (bIdx !== -1) return -1;
    return a.localeCompare(b);
  });
  for (const key of keys) {
    sorted[key] = groups[key];
  }
  return sorted;
}

export function getStepsProgress(steps: Step[]): {
  done: number;
  total: number;
} {
  if (!steps || steps.length === 0) return { done: 0, total: 0 };
  return {
    done: steps.filter((s) => s.done).length,
    total: steps.length,
  };
}

export function generateStepId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Group items by due-date buckets: "Overdue", "Today", "Tomorrow",
 * named weekdays for the next `days` days, "Later", "No Due Date".
 */
export function groupByDueDate(
  items: CalendarItem[],
  days: number = 7
): Record<string, CalendarItem[]> {
  const groups: Record<string, CalendarItem[]> = {};
  const now = new Date();
  const todayStart = startOfDay(now);

  const addToGroup = (key: string, item: CalendarItem) => {
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  };

  // Pre-compute the end boundary for the "named day" range
  const rangeEnd = startOfDay(addDays(todayStart, days));

  for (const item of items) {
    if (!item.due_date) {
      addToGroup("No Due Date", item);
      continue;
    }

    const due = new Date(item.due_date);
    const dueDay = startOfDay(due);

    if (
      isBefore(dueDay, todayStart) &&
      item.status !== "completed" &&
      item.status !== "cancelled"
    ) {
      addToGroup("Overdue", item);
    } else if (isToday(due)) {
      addToGroup("Today", item);
    } else if (isTomorrow(due)) {
      addToGroup("Tomorrow", item);
    } else if (isBefore(dueDay, rangeEnd)) {
      // Named day like "Wed, Jan 29"
      addToGroup(format(due, "EEE, MMM d"), item);
    } else {
      addToGroup("Later", item);
    }
  }

  // Sort keys in a logical order: Overdue, Today, Tomorrow, date buckets, Later, No Due Date
  const orderedKeys: string[] = [];
  const specialOrder = ["Overdue", "Today", "Tomorrow"];
  for (const key of specialOrder) {
    if (groups[key]) orderedKeys.push(key);
  }

  // Date-keyed buckets sorted chronologically
  const dateBuckets = Object.keys(groups).filter(
    (k) => !specialOrder.includes(k) && k !== "Later" && k !== "No Due Date"
  );
  dateBuckets.sort((a, b) => {
    // These are formatted dates; find the first item in each to sort
    const aDate = groups[a][0]?.due_date || "";
    const bDate = groups[b][0]?.due_date || "";
    return aDate.localeCompare(bDate);
  });
  orderedKeys.push(...dateBuckets);

  if (groups["Later"]) orderedKeys.push("Later");
  if (groups["No Due Date"]) orderedKeys.push("No Due Date");

  const sorted: Record<string, CalendarItem[]> = {};
  for (const key of orderedKeys) {
    sorted[key] = groups[key];
  }
  return sorted;
}
