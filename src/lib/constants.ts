import { ItemType, ItemSource, ItemPriority, ItemStatus, EffortEstimate, BoardColumnConfig, BoardViewMode } from "@/types";

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  assignment: "Assignment",
  test: "Test",
  quiz: "Quiz",
  activity: "Activity",
  task: "Task",
};

export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  assignment: "#3b82f6", // blue
  test: "#ef4444", // red
  quiz: "#f97316", // orange
  activity: "#22c55e", // green
  task: "#a855f7", // purple
};

export const ITEM_SOURCE_LABELS: Record<ItemSource, string> = {
  google_classroom: "Google Classroom",
  canvas: "Canvas",
  gmail: "Gmail",
  manual: "Manual",
};

export const ITEM_SOURCE_ICONS: Record<ItemSource, string> = {
  google_classroom: "graduation-cap",
  canvas: "layout",
  gmail: "mail",
  manual: "edit",
};

export const ITEM_PRIORITY_LABELS: Record<ItemPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BOARD_COLUMNS: BoardColumnConfig[] = [
  { id: "pending", title: "Not Started", color: "gray" },
  { id: "in_progress", title: "In Progress", color: "blue" },
  { id: "completed", title: "Completed", color: "green" },
  { id: "cancelled", title: "Cancelled", color: "red" },
];

export const EFFORT_OPTIONS: { value: EffortEstimate; label: string }[] = [
  { value: "10m", label: "10 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "3h+", label: "3+ hours" },
];

export const EFFORT_COLORS: Record<EffortEstimate, string> = {
  "10m": "bg-green-100 text-green-700",
  "30m": "bg-lime-100 text-lime-700",
  "1h": "bg-yellow-100 text-yellow-700",
  "2h": "bg-orange-100 text-orange-700",
  "3h+": "bg-red-100 text-red-700",
};

export const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Time (JST)" },
  { value: "Asia/Shanghai", label: "China Time (CST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export const GOOGLE_CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export const CANVAS_API_ENDPOINTS = {
  courses: "/api/v1/courses",
  calendarEvents: "/api/v1/users/self/calendar_events",
  todoItems: "/api/v1/users/self/todo",
  assignments: (courseId: number) => `/api/v1/courses/${courseId}/assignments`,
};

export const BOARD_VIEW_MODES: { value: BoardViewMode; label: string }[] = [
  { value: "by_course", label: "By Subject" },
  { value: "by_type", label: "By Type" },
  { value: "this_week", label: "This Week" },
  { value: "due_list", label: "Due List" },
];
