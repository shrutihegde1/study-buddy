"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  isToday,
  isPast,
  isThisWeek,
  parseISO,
  format,
  addDays,
  isSameDay,
} from "date-fns";
import type { CalendarItem } from "@/types";

export function DashboardView() {
  const { items, isLoading, toggleComplete } = useCalendarItems();
  const { isHidden } = useHiddenSubjects();

  const filteredItems = useMemo(
    () => items.filter((item) => !isHidden(item.course_name ?? "")),
    [items, isHidden]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <StatsRow items={filteredItems} />
      <div className="grid lg:grid-cols-2 gap-6">
        <NeedsAttention items={filteredItems} toggleComplete={toggleComplete} />
        <WeekStrip items={filteredItems} />
      </div>
      <ThisWeek items={filteredItems} />
    </div>
  );
}

function StatsRow({ items }: { items: CalendarItem[] }) {
  const stats = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let dueThisWeek = 0;
    let completed = 0;

    items.forEach((item) => {
      if (item.status === "completed") {
        completed++;
        return;
      }
      if (item.status === "cancelled") return;

      const dueDate = item.due_date ? parseISO(item.due_date) : null;
      if (!dueDate) return;

      if (isPast(dueDate) && !isToday(dueDate)) {
        if (item.item_type === "assignment" || item.item_type === "task") {
          overdue++;
        }
      }
      if (isToday(dueDate)) {
        dueToday++;
      }
      if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
        dueThisWeek++;
      }
    });

    return { overdue, dueToday, dueThisWeek, completed };
  }, [items]);

  const cards = [
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    {
      label: "Due Today",
      value: stats.dueToday,
      icon: CalendarClock,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Due This Week",
      value: stats.dueThisWeek,
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NeedsAttention({
  items,
  toggleComplete,
}: {
  items: CalendarItem[];
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
}) {
  const { overdueItems, todayItems } = useMemo(() => {
    const overdue: CalendarItem[] = [];
    const today: CalendarItem[] = [];

    items.forEach((item) => {
      if (item.status === "completed" || item.status === "cancelled") return;
      if (!item.due_date) return;

      const dueDate = parseISO(item.due_date);

      if (isToday(dueDate)) {
        today.push(item);
      } else if (
        isPast(dueDate) &&
        (item.item_type === "assignment" || item.item_type === "task")
      ) {
        overdue.push(item);
      }
    });

    overdue.sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
    today.sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );

    return { overdueItems: overdue, todayItems: today };
  }, [items]);

  const isEmpty = overdueItems.length === 0 && todayItems.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Needs Attention
          </CardTitle>
          <Link
            href="/due-list"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-700">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {overdueItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">
                  Overdue
                </h4>
                <div className="space-y-1">
                  {overdueItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-md bg-red-50 px-3 py-2"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={(checked) =>
                          toggleComplete(item.id, checked as boolean)
                        }
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.course_name && (
                            <span className="text-xs text-muted-foreground">
                              {item.course_name}
                            </span>
                          )}
                          <span className="text-xs text-red-600 font-medium">
                            {format(parseISO(item.due_date!), "MMM d")}
                          </span>
                        </div>
                      </div>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {todayItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
                  Today
                </h4>
                <div className="space-y-1">
                  {todayItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-md bg-blue-50 px-3 py-2"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={(checked) =>
                          toggleComplete(item.id, checked as boolean)
                        }
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {item.title}
                          </span>
                          <Badge
                            variant={
                              item.item_type as
                                | "assignment"
                                | "test"
                                | "quiz"
                                | "activity"
                                | "task"
                            }
                            className="shrink-0"
                          >
                            {ITEM_TYPE_LABELS[item.item_type]}
                          </Badge>
                        </div>
                        {item.course_name && (
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {item.course_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeekStrip({ items }: { items: CalendarItem[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const count = items.filter((item) => {
        if (item.status === "completed" || item.status === "cancelled")
          return false;
        if (!item.due_date) return false;
        return isSameDay(parseISO(item.due_date), date);
      }).length;
      return { date, count, isToday: i === 0 };
    });
  }, [items]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">This Week</CardTitle>
          <Link
            href="/calendar"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Full calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <Link
              key={day.date.toISOString()}
              href="/calendar"
              className={`flex flex-col items-center rounded-lg p-2 transition-colors hover:bg-gray-50 ${
                day.isToday ? "bg-primary/10 ring-1 ring-primary" : ""
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {format(day.date, "EEE")}
              </span>
              <span
                className={`text-lg font-semibold ${
                  day.isToday ? "text-primary" : "text-gray-900"
                }`}
              >
                {format(day.date, "d")}
              </span>
              {day.count > 0 && (
                <span className="mt-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {day.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ThisWeek({ items }: { items: CalendarItem[] }) {
  const dayGroups = useMemo(() => {
    const today = new Date();
    const groups: { date: Date; label: string; items: CalendarItem[] }[] = [];

    for (let i = 1; i <= 6; i++) {
      const date = addDays(today, i);
      const label =
        i === 1 ? "Tomorrow" : format(date, "EEE, MMM d");

      const dayItems = items
        .filter((item) => {
          if (item.status === "completed" || item.status === "cancelled")
            return false;
          if (!item.due_date) return false;
          return isSameDay(parseISO(item.due_date), date);
        })
        .sort(
          (a, b) =>
            new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
        );

      if (dayItems.length > 0) {
        groups.push({ date, label, items: dayItems });
      }
    }

    return groups;
  }, [items]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">This Week</CardTitle>
          <Link
            href="/due-list"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {dayGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming items this week
          </p>
        ) : (
          <div className="space-y-4">
            {dayGroups.map((group) => (
              <div key={group.label}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      <Badge
                        variant={
                          item.item_type as
                            | "assignment"
                            | "test"
                            | "quiz"
                            | "activity"
                            | "task"
                        }
                        className="shrink-0"
                      >
                        {ITEM_TYPE_LABELS[item.item_type]}
                      </Badge>
                      <span className="text-sm font-medium truncate flex-1">
                        {item.title}
                      </span>
                      {item.course_name && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {item.course_name}
                        </span>
                      )}
                      {!item.all_day && item.due_date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(parseISO(item.due_date), "h:mm a")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div>
                <div className="h-6 w-10 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((g) => (
            <div key={g}>
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="space-y-1">
                <div className="h-9 bg-gray-100 rounded" />
                <div className="h-9 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
