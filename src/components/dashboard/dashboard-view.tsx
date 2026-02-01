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
        <UpcomingItemsList items={filteredItems} toggleComplete={toggleComplete} />
        <WeekStrip items={filteredItems} />
      </div>
      <SubjectProgress items={filteredItems} />
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
        overdue++;
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

function UpcomingItemsList({
  items,
  toggleComplete,
}: {
  items: CalendarItem[];
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
}) {
  const upcoming = useMemo(() => {
    return items
      .filter(
        (item) =>
          (item.status === "pending" || item.status === "in_progress") &&
          item.due_date
      )
      .sort(
        (a, b) =>
          new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      )
      .slice(0, 5);
  }, [items]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming</CardTitle>
          <Link
            href="/due-list"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming items
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <Checkbox
                  checked={false}
                  onCheckedChange={(checked) =>
                    toggleComplete(item.id, checked as boolean)
                  }
                  className="mt-0.5"
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
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.course_name && (
                      <span className="text-xs text-muted-foreground">
                        {item.course_name}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(item.due_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

function SubjectProgress({ items }: { items: CalendarItem[] }) {
  const subjects = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();

    items.forEach((item) => {
      const course = item.course_name || "Uncategorized";
      const entry = map.get(course) || { total: 0, completed: 0 };
      entry.total++;
      if (item.status === "completed") entry.completed++;
      map.set(course, entry);
    });

    return Array.from(map.entries())
      .map(([name, { total, completed }]) => ({
        name,
        total,
        completed,
        percent: Math.round((completed / total) * 100),
      }))
      .sort((a, b) => a.percent - b.percent);
  }, [items]);

  if (subjects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Progress by Subject
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{subject.name}</span>
                <span className="text-xs text-muted-foreground">
                  {subject.completed}/{subject.total} ({subject.percent}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${subject.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
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
          <div className="h-6 bg-gray-100 rounded" />
          <div className="h-6 bg-gray-100 rounded" />
          <div className="h-6 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
