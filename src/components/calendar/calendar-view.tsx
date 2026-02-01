"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { useHiddenSubjects } from "@/hooks/use-hidden-subjects";
import { ITEM_TYPE_COLORS } from "@/lib/constants";
import type { CalendarItem } from "@/types";

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onEventClick?: (item: CalendarItem) => void;
}

export function CalendarView({ onDateSelect, onEventClick }: CalendarViewProps) {
  const { items, isLoading } = useCalendarItems();
  const { isHidden } = useHiddenSubjects();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const events = items
    .filter((item) => !isHidden(item.course_name ?? ""))
    .map((item) => ({
    id: item.id,
    title: item.title,
    start: item.due_date || item.start_time || undefined,
    end: item.end_time || undefined,
    allDay: item.all_day,
    backgroundColor: ITEM_TYPE_COLORS[item.item_type],
    borderColor: ITEM_TYPE_COLORS[item.item_type],
    extendedProps: { item },
  }));

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow p-6 min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        dateClick={(info) => onDateSelect?.(info.date)}
        eventClick={(info) => {
          const item = info.event.extendedProps.item as CalendarItem;
          onEventClick?.(item);
        }}
        height="auto"
        aspectRatio={1.8}
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        weekends={true}
        nowIndicator={true}
        eventDisplay="block"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
