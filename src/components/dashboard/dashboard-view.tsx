"use client";

import { useMemo, useState } from "react";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import {
  isToday,
  isBefore,
  isThisWeek,
  parseISO,
  format,
  startOfDay,
} from "date-fns";
import { parseDueDate } from "@/lib/board-utils";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { CalendarItem } from "@/types";

type TileKey = "overdue" | "dueToday" | "dueThisWeek" | "completed";

export function DashboardView() {
  const { items, isLoading, toggleComplete } = useCalendarItems();
  const { isHidden } = useHiddenSubjects();
  const [activeTile, setActiveTile] = useState<TileKey | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => !isHidden(item.course_name ?? "")),
    [items, isHidden]
  );

  const handleTileClick = (tile: TileKey) => {
    setActiveTile((prev) => (prev === tile ? null : tile));
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <StatsRow
        items={filteredItems}
        activeTile={activeTile}
        onTileClick={handleTileClick}
      />
      {activeTile === null ? (
        <CalendarView />
      ) : (
        <DashboardItemList
          items={filteredItems}
          category={activeTile}
          toggleComplete={toggleComplete}
        />
      )}
    </div>
  );
}

const TILE_CONFIG: {
  key: TileKey;
  label: string;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  ring: string;
}[] = [
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-100",
    ring: "ring-2 ring-red-400",
  },
  {
    key: "dueToday",
    label: "Due Today",
    icon: CalendarClock,
    color: "text-blue-600",
    bg: "bg-blue-100",
    ring: "ring-2 ring-blue-400",
  },
  {
    key: "dueThisWeek",
    label: "Due This Week",
    icon: CalendarDays,
    color: "text-orange-600",
    bg: "bg-orange-100",
    ring: "ring-2 ring-orange-400",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-100",
    ring: "ring-2 ring-green-400",
  },
];

function StatsRow({
  items,
  activeTile,
  onTileClick,
}: {
  items: CalendarItem[];
  activeTile: TileKey | null;
  onTileClick: (tile: TileKey) => void;
}) {
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

      if (!item.due_date) return;
      const dueDate = parseDueDate(item.due_date);
      const todayMidnight = startOfDay(new Date());

      if (isBefore(dueDate, todayMidnight)) {
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {TILE_CONFIG.map((card) => {
        const isActive = activeTile === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onTileClick(card.key)}
            className="text-left"
          >
            <Card
              className={`transition-shadow cursor-pointer hover:shadow-md ${
                isActive ? card.ring : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats[card.key]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {card.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

const CATEGORY_LABELS: Record<TileKey, string> = {
  overdue: "Overdue",
  dueToday: "Due Today",
  dueThisWeek: "Due This Week",
  completed: "Completed",
};

function DashboardItemList({
  items,
  category,
  toggleComplete,
}: {
  items: CalendarItem[];
  category: TileKey;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
}) {
  const categoryItems = useMemo(() => {
    const todayMidnight = startOfDay(new Date());

    return items.filter((item) => {
      switch (category) {
        case "overdue":
          if (item.status === "completed" || item.status === "cancelled")
            return false;
          if (!item.due_date) return false;
          if (item.item_type !== "assignment" && item.item_type !== "task")
            return false;
          return isBefore(parseDueDate(item.due_date), todayMidnight);

        case "dueToday":
          if (item.status === "completed" || item.status === "cancelled")
            return false;
          if (!item.due_date) return false;
          return isToday(parseDueDate(item.due_date));

        case "dueThisWeek":
          if (item.status === "completed" || item.status === "cancelled")
            return false;
          if (!item.due_date) return false;
          return isThisWeek(parseDueDate(item.due_date), { weekStartsOn: 1 });

        case "completed":
          return item.status === "completed";

        default:
          return false;
      }
    });
  }, [items, category]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {CATEGORY_LABELS[category]}{" "}
          <span className="text-muted-foreground font-normal">
            ({categoryItems.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              No items in this category
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50"
              >
                <Checkbox
                  checked={item.status === "completed"}
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
                    {item.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(
                          parseISO(item.due_date),
                          parseDueDate(item.due_date).getFullYear() !==
                            new Date().getFullYear()
                            ? "MMM d, yyyy"
                            : "MMM d"
                        )}
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border p-4 animate-pulse"
          >
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
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
