"use client";

import { useMemo, useState } from "react";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { useFocusTimer } from "@/components/focus-timer/focus-timer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Play,
  Timer,
  Hourglass,
  Clock,
  Eye,
  Trash2,
  Ban,
  ExternalLink,
} from "lucide-react";
import { ITEM_TYPE_LABELS, ITEM_SOURCE_LABELS } from "@/lib/constants";
import {
  isToday,
  isBefore,
  isAfter,
  parseISO,
  format,
  startOfDay,
  addDays,
} from "date-fns";
import { parseDueDate } from "@/lib/board-utils";
import { stripHtml } from "@/lib/utils";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { CalendarItem, ItemStatus } from "@/types";

type TileKey = "nextUp" | "next10Days" | "overdue";

export function DashboardView() {
  const { items, isLoading, toggleComplete, updateItem } = useCalendarItems();
  const { isHidden } = useHiddenSubjects();
  const { startFocusTimer } = useFocusTimer();
  const [activeTile, setActiveTile] = useState<TileKey | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => !isHidden(item.course_name ?? "")),
    [items, isHidden]
  );

  // Find items due in the next 48 hours (pending, not overdue, has due date)
  const nextUpItems = useMemo(() => {
    const now = new Date();
    const todayMidnight = startOfDay(now);
    const in48Hours = addDays(now, 2);

    // Get all pending items with due dates within 48 hours
    const upcomingItems = filteredItems.filter(
      (item) =>
        item.status === "pending" &&
        item.due_date &&
        (item.item_type === "assignment" || item.item_type === "task") &&
        !isBefore(parseDueDate(item.due_date), todayMidnight) &&
        isBefore(parseDueDate(item.due_date), in48Hours)
    );

    // Sort by due date ascending
    upcomingItems.sort((a, b) => {
      const dateA = parseDueDate(a.due_date!);
      const dateB = parseDueDate(b.due_date!);
      return dateA.getTime() - dateB.getTime();
    });

    return upcomingItems;
  }, [filteredItems]);

  // Get overdue items
  const overdueItems = useMemo(() => {
    const todayMidnight = startOfDay(new Date());
    return filteredItems.filter(
      (item) =>
        item.status !== "completed" &&
        item.status !== "cancelled" &&
        item.due_date &&
        (item.item_type === "assignment" || item.item_type === "task") &&
        isBefore(parseDueDate(item.due_date), todayMidnight)
    );
  }, [filteredItems]);

  const handleStart = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "in_progress" });
  };

  const handleStartWithFocus = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "in_progress" });
    startFocusTimer(item.id, item.title);
  };

  // Snooze all overdue items to 1 week from now
  const handleSnoozeOverdue = async () => {
    const nextWeek = addDays(startOfDay(new Date()), 7);
    const nextWeekStr = nextWeek.toISOString();
    for (const item of overdueItems) {
      await updateItem({ id: item.id, due_date: nextWeekStr });
    }
  };

  // Review most recent overdue item (click the tile to see list)
  const handleReviewOverdue = () => {
    setActiveTile("overdue");
  };

  // Clear all overdue items (mark as completed)
  const handleClearOverdue = async () => {
    for (const item of overdueItems) {
      await updateItem({ id: item.id, status: "completed", completed_at: new Date().toISOString() });
    }
  };

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
        nextUpItems={nextUpItems}
        overdueCount={overdueItems.length}
        activeTile={activeTile}
        onTileClick={handleTileClick}
        onStart={handleStart}
        onStartWithFocus={handleStartWithFocus}
        onComplete={toggleComplete}
        onSnoozeOverdue={handleSnoozeOverdue}
        onReviewOverdue={handleReviewOverdue}
        onClearOverdue={handleClearOverdue}
      />
      {activeTile === null ? (
        <CalendarView />
      ) : activeTile === "nextUp" ? (
        nextUpItems.length > 0 ? (
          <NextUpList
            items={nextUpItems}
            onStart={handleStart}
            onStartWithFocus={handleStartWithFocus}
            onComplete={toggleComplete}
          />
        ) : (
          <EmptyState message="Nothing due in 2 days" />
        )
      ) : (
        <DashboardItemList
          items={filteredItems}
          category={activeTile}
          toggleComplete={toggleComplete}
          onStart={handleStart}
          onStartWithFocus={handleStartWithFocus}
          updateItem={updateItem}
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
  iconBg: string;
  tileBg: string;
  ring: string;
}[] = [
  {
    key: "nextUp",
    label: "Next Up",
    icon: Hourglass,
    color: "text-blue-600",
    iconBg: "bg-blue-100",
    tileBg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    ring: "ring-2 ring-blue-400",
  },
  {
    key: "next10Days",
    label: "Next 10 Days",
    icon: CalendarDays,
    color: "text-amber-600",
    iconBg: "bg-amber-100",
    tileBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    ring: "ring-2 ring-amber-400",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-rose-600",
    iconBg: "bg-rose-100",
    tileBg: "bg-gradient-to-br from-rose-50 to-pink-50",
    ring: "ring-2 ring-rose-400",
  },
];

function StatsRow({
  items,
  nextUpItems,
  overdueCount,
  activeTile,
  onTileClick,
  onStart,
  onStartWithFocus,
  onComplete,
  onSnoozeOverdue,
  onReviewOverdue,
  onClearOverdue,
}: {
  items: CalendarItem[];
  nextUpItems: CalendarItem[];
  overdueCount: number;
  activeTile: TileKey | null;
  onTileClick: (tile: TileKey) => void;
  onStart: (item: CalendarItem) => Promise<void>;
  onStartWithFocus: (item: CalendarItem) => Promise<void>;
  onComplete: (id: string, completed: boolean) => Promise<void>;
  onSnoozeOverdue: () => Promise<void>;
  onReviewOverdue: () => void;
  onClearOverdue: () => Promise<void>;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStartingFocus, setIsStartingFocus] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Get the first item for quick actions on the tile
  const firstNextUpItem = nextUpItems[0] || null;

  const stats = useMemo(() => {
    let next10Days = 0;

    const todayMidnight = startOfDay(new Date());
    const tenDaysFromNow = addDays(todayMidnight, 10);

    items.forEach((item) => {
      if (item.status === "completed" || item.status === "cancelled") return;
      if (!item.due_date) return;

      const dueDate = parseDueDate(item.due_date);

      if (
        !isBefore(dueDate, todayMidnight) &&
        !isAfter(dueDate, tenDaysFromNow)
      ) {
        next10Days++;
      }
    });

    return { overdue: overdueCount, next10Days, nextUp: nextUpItems.length };
  }, [items, nextUpItems, overdueCount]);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firstNextUpItem) return;
    setIsStarting(true);
    try {
      await onStart(firstNextUpItem);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartFocus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firstNextUpItem) return;
    setIsStartingFocus(true);
    try {
      await onStartWithFocus(firstNextUpItem);
    } finally {
      setIsStartingFocus(false);
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firstNextUpItem) return;
    setIsCompleting(true);
    try {
      await onComplete(firstNextUpItem.id, true);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSnooze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSnoozing(true);
    try {
      await onSnoozeOverdue();
    } finally {
      setIsSnoozing(false);
    }
  };

  const handleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReviewOverdue();
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClearing(true);
    try {
      await onClearOverdue();
    } finally {
      setIsClearing(false);
    }
  };

  // Get due date label for next up item
  const getNextUpDueLabel = () => {
    if (!firstNextUpItem?.due_date) return null;
    const dueDate = parseDueDate(firstNextUpItem.due_date);
    const isDueTodayItem = isToday(dueDate);

    return {
      text: isDueTodayItem ? "Due today" : format(dueDate, "MMM d 'at' h:mm a"),
      className: isDueTodayItem ? "text-blue-600" : "text-muted-foreground",
    };
  };

  const dueLabel = getNextUpDueLabel();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {TILE_CONFIG.map((card) => {
        const isActive = activeTile === card.key;
        const isNextUp = card.key === "nextUp";

        return (
          <div
            key={card.key}
            role="button"
            tabIndex={0}
            onClick={() => onTileClick(card.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTileClick(card.key);
              }
            }}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
          >
            <Card
              className={`transition-all cursor-pointer hover:shadow-lg border h-full ${card.tileBg} ${
                isActive ? card.ring : "hover:border-gray-300"
              }`}
            >
              <CardContent className="p-5 h-full flex flex-col">
                {/* Header row - consistent across all tiles */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    {card.label}
                  </span>
                  <div className={`rounded-full p-2.5 ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>

                {/* Content - varies by tile type */}
                <div className="flex-1 flex flex-col justify-between min-h-[100px]">
                  {isNextUp ? (
                    firstNextUpItem ? (
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 truncate leading-tight">
                            {firstNextUpItem.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {firstNextUpItem.course_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {firstNextUpItem.course_name}
                              </span>
                            )}
                            {firstNextUpItem.course_name && dueLabel && (
                              <span className="text-muted-foreground">·</span>
                            )}
                            {dueLabel && (
                              <span className={`text-xs font-medium ${dueLabel.className}`}>
                                {dueLabel.text}
                              </span>
                            )}
                            {nextUpItems.length > 1 && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-xs text-blue-600 font-medium">
                                  +{nextUpItems.length - 1} more
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStart}
                            disabled={isStarting || isStartingFocus || isCompleting}
                            className="flex-1 h-9 bg-white/80"
                            title="Start working"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartFocus}
                            disabled={isStarting || isStartingFocus || isCompleting}
                            className="flex-1 h-9 bg-white/80"
                            title="Start with focus timer"
                          >
                            <Timer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleComplete}
                            disabled={isStarting || isStartingFocus || isCompleting}
                            className="flex-1 h-9 bg-white/80"
                            title="Mark as complete"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center h-full">
                        <p className="font-semibold text-green-700">Nothing due in 2 days</p>
                      </div>
                    )
                  ) : card.key === "overdue" ? (
                    stats.overdue > 0 ? (
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <p className="text-3xl font-bold text-gray-900">
                            {stats.overdue}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            items need attention
                          </p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSnooze}
                            disabled={isSnoozing || isClearing}
                            className="flex-1 h-9 bg-white/80"
                            title="Snooze all to tomorrow"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReview}
                            className="flex-1 h-9 bg-white/80"
                            title="Review overdue items"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            disabled={isSnoozing || isClearing}
                            className="flex-1 h-9 bg-white/80"
                            title="Clear all overdue"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center h-full">
                        <p className="font-semibold text-green-700">No overdue!</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You&apos;re on track
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col justify-center h-full">
                      <p className="text-3xl font-bold text-gray-900">
                        {stats[card.key]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        items coming up
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function NextUpList({
  items,
  onStart,
  onStartWithFocus,
  onComplete,
}: {
  items: CalendarItem[];
  onStart: (item: CalendarItem) => Promise<void>;
  onStartWithFocus: (item: CalendarItem) => Promise<void>;
  onComplete: (id: string, completed: boolean) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Due in Next 48 Hours{" "}
          <span className="text-muted-foreground font-normal">
            ({items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => {
            const dueDate = item.due_date ? parseDueDate(item.due_date) : null;
            const isDueTodayItem = dueDate && isToday(dueDate);

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-white hover:bg-gray-50"
              >
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
                    {dueDate && (
                      <span
                        className={`text-xs font-medium ${
                          isDueTodayItem ? "text-blue-600" : "text-muted-foreground"
                        }`}
                      >
                        {isDueTodayItem
                          ? "Due today"
                          : format(dueDate, "MMM d 'at' h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStart(item)}
                    className="h-7 w-7 p-0"
                    title="Start working on this task"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartWithFocus(item)}
                    className="h-7 w-7 p-0"
                    title="Start with 30-min focus timer"
                  >
                    <Timer className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onComplete(item.id, true)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600 hover:border-green-200"
                    title="Mark as complete"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_LABELS: Record<TileKey, string> = {
  nextUp: "Next Up",
  next10Days: "Next 10 Days",
  overdue: "Overdue",
};

function DashboardItemList({
  items,
  category,
  toggleComplete,
  onStart,
  onStartWithFocus,
  updateItem,
}: {
  items: CalendarItem[];
  category: TileKey;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
  onStart: (item: CalendarItem) => Promise<void>;
  onStartWithFocus: (item: CalendarItem) => Promise<void>;
  updateItem: (input: { id: string; due_date?: string; status?: ItemStatus; completed_at?: string | null }) => Promise<CalendarItem>;
}) {
  const [closeOlderThanWeeks, setCloseOlderThanWeeks] = useState(4);
  const [isClosingOld, setIsClosingOld] = useState(false);

  const categoryItems = useMemo(() => {
    const todayMidnight = startOfDay(new Date());
    const tenDaysFromNow = addDays(todayMidnight, 10);

    return items
      .filter((item) => {
        if (item.status === "completed" || item.status === "cancelled")
          return false;

        switch (category) {
          case "overdue":
            if (!item.due_date) return false;
            if (item.item_type !== "assignment" && item.item_type !== "task")
              return false;
            return isBefore(parseDueDate(item.due_date), todayMidnight);

          case "next10Days":
            if (!item.due_date) return false;
            const dueDate = parseDueDate(item.due_date);
            return (
              !isBefore(dueDate, todayMidnight) &&
              !isAfter(dueDate, tenDaysFromNow)
            );

          default:
            return false;
        }
      })
      .sort((a, b) => {
        if (!a.due_date || !b.due_date) return 0;
        return (
          parseDueDate(a.due_date).getTime() -
          parseDueDate(b.due_date).getTime()
        );
      });
  }, [items, category]);

  const handleSnoozeItem = async (item: CalendarItem) => {
    const nextWeek = addDays(startOfDay(new Date()), 7);
    await updateItem({ id: item.id, due_date: nextWeek.toISOString() });
  };

  const handleCloseItem = async (item: CalendarItem) => {
    await updateItem({ id: item.id, status: "cancelled" });
  };

  const handleCloseOldItems = async () => {
    setIsClosingOld(true);
    try {
      const cutoffDate = addDays(startOfDay(new Date()), -closeOlderThanWeeks * 7);
      const oldItems = categoryItems.filter(
        (item) => item.due_date && isBefore(parseDueDate(item.due_date), cutoffDate)
      );
      for (const item of oldItems) {
        await updateItem({ id: item.id, status: "cancelled" });
      }
    } finally {
      setIsClosingOld(false);
    }
  };

  const isOverdue = category === "overdue";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {CATEGORY_LABELS[category]}{" "}
            <span className="text-muted-foreground font-normal">
              ({categoryItems.length})
            </span>
          </CardTitle>
          {isOverdue && categoryItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Close older than</span>
              <select
                value={closeOlderThanWeeks}
                onChange={(e) => setCloseOlderThanWeeks(Number(e.target.value))}
                className="h-8 px-2 text-xs border rounded-md bg-white"
              >
                <option value={1}>1 week</option>
                <option value={2}>2 weeks</option>
                <option value={3}>3 weeks</option>
                <option value={4}>4 weeks</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseOldItems}
                disabled={isClosingOld}
                className="h-8 text-xs"
              >
                {isClosingOld ? "Closing..." : "Close"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              No items in this category
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900">
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

                  {item.description && stripHtml(item.description) && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {stripHtml(item.description)}
                    </p>
                  )}
                </div>

                {isOverdue ? (
                  <div className="flex gap-1 shrink-0 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStart(item)}
                      className="h-8 w-8 p-0"
                      title="Start working on this task"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartWithFocus(item)}
                      className="h-8 w-8 p-0"
                      title="Start with 30-min focus timer"
                    >
                      <Timer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSnoozeItem(item)}
                      className="h-8 w-8 p-0"
                      title="Snooze for 1 week"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseItem(item)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:border-red-200"
                      title="Dismiss — this task won't appear again"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleComplete(item.id, true)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 hover:border-green-200"
                      title="Mark as complete"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Checkbox
                    checked={item.status === "completed"}
                    onCheckedChange={(checked) =>
                      toggleComplete(item.id, checked as boolean)
                    }
                    className="shrink-0 mt-1"
                  />
                )}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border-2 border-transparent p-5 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-12 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6 animate-pulse">
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
