import ICAL from "ical.js";
import type { CreateCalendarItemInput, ItemType } from "@/types";

interface ParsedEvent {
  uid: string;
  summary: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  url?: string;
  location?: string;
  categories?: string[];
}

export async function fetchAndParseICalFeed(url: string): Promise<ParsedEvent[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar feed: ${response.status} ${response.statusText}`);
  }

  const icalData = await response.text();
  return parseICalData(icalData);
}

export function parseICalData(icalData: string): ParsedEvent[] {
  const jcalData = ICAL.parse(icalData);
  const vcalendar = new ICAL.Component(jcalData);
  const vevents = vcalendar.getAllSubcomponents("vevent");

  const events: ParsedEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);

    // Skip events without a start date
    if (!event.startDate) continue;

    const startDate = event.startDate.toJSDate();
    const endDate = event.endDate ? event.endDate.toJSDate() : undefined;

    // Check if it's an all-day event
    const allDay = event.startDate.isDate;

    // Get URL from various possible properties
    let urlValue = vevent.getFirstPropertyValue("url");
    let url: string | undefined;
    if (typeof urlValue === "string") {
      url = urlValue;
    } else if (!urlValue) {
      // Try to extract URL from description
      const description = event.description || "";
      const urlMatch = description.match(/https?:\/\/[^\s<>"]+/);
      if (urlMatch) {
        url = urlMatch[0];
      }
    }

    // Get categories
    const categoriesProp = vevent.getAllProperties("categories");
    const categories: string[] = [];
    for (const cat of categoriesProp) {
      const values = cat.getValues();
      for (const v of values) {
        if (typeof v === "string") {
          categories.push(v);
        }
      }
    }

    events.push({
      uid: event.uid,
      summary: event.summary || "Untitled Event",
      description: event.description || undefined,
      startDate,
      endDate,
      allDay,
      url,
      location: event.location || undefined,
      categories,
    });
  }

  return events;
}

export function determineItemType(event: ParsedEvent): ItemType {
  const text = `${event.summary} ${event.description || ""} ${event.categories?.join(" ") || ""}`.toLowerCase();

  // Check for quiz
  if (text.includes("quiz")) {
    return "quiz";
  }

  // Check for test/exam
  if (text.includes("test") || text.includes("exam") || text.includes("midterm") || text.includes("final")) {
    return "test";
  }

  // Check for assignment
  if (text.includes("assignment") || text.includes("homework") || text.includes("due") || text.includes("submit")) {
    return "assignment";
  }

  // Check for activity/event
  if (text.includes("event") || text.includes("meeting") || text.includes("class") || text.includes("lecture")) {
    return "activity";
  }

  // Default to assignment for Canvas items (most common)
  return "assignment";
}

export function extractCourseName(event: ParsedEvent): string | null {
  // Try to extract course name from categories
  if (event.categories && event.categories.length > 0) {
    return event.categories[0];
  }

  // Try to extract from summary (often formatted as "Course Name: Assignment Name")
  const colonMatch = event.summary.match(/^([^:]+):/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  // Try to extract from summary (often formatted as "[Course Name] Assignment Name")
  const bracketMatch = event.summary.match(/^\[([^\]]+)\]/);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }

  return null;
}

export function convertEventToCalendarItem(event: ParsedEvent): CreateCalendarItemInput {
  const itemType = determineItemType(event);
  const courseName = extractCourseName(event);

  // Clean up the title by removing course prefix if present
  let title = event.summary;
  if (courseName) {
    title = title.replace(/^[^:]+:\s*/, "").replace(/^\[[^\]]+\]\s*/, "");
  }

  // For assignments, use startDate as due_date
  // For activities/events, use start_time and end_time
  const isActivityType = itemType === "activity";

  return {
    title,
    description: event.description || null,
    item_type: itemType,
    due_date: !isActivityType ? event.startDate.toISOString() : null,
    start_time: isActivityType ? event.startDate.toISOString() : null,
    end_time: isActivityType && event.endDate ? event.endDate.toISOString() : null,
    all_day: event.allDay,
    source: "canvas",
    source_id: `ical_${event.uid}`,
    source_url: event.url || null,
    course_name: courseName,
    priority: "medium",
  };
}

export async function parseCanvasCalendarFeed(
  calendarUrl: string
): Promise<CreateCalendarItemInput[]> {
  const events = await fetchAndParseICalFeed(calendarUrl);

  // Filter to only future events and recent past (last 7 days)
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const relevantEvents = events.filter((event) => {
    return event.startDate >= oneWeekAgo;
  });

  return relevantEvents.map(convertEventToCalendarItem);
}

export function validateCanvasCalendarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Canvas calendar URLs typically contain "calendar" and end with .ics
    return (
      parsed.protocol === "https:" &&
      (url.includes("calendar") || url.endsWith(".ics"))
    );
  } catch {
    return false;
  }
}
