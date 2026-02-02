export type ItemType = 'assignment' | 'test' | 'quiz' | 'activity' | 'task';
export type ItemSource = 'google_classroom' | 'canvas' | 'gmail' | 'manual';
export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ItemPriority = 'low' | 'medium' | 'high';
export type EffortEstimate = '10m' | '30m' | '1h' | '2h' | '3h+';

export interface Step {
  id: string;
  label: string;
  done: boolean;
}

export interface BoardColumnConfig {
  id: ItemStatus;
  title: string;
  color: string;
}

export interface CalendarItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  item_type: ItemType;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  source: ItemSource;
  source_id: string | null;
  source_url: string | null;
  course_name: string | null;
  status: ItemStatus;
  completed_at: string | null;
  priority: ItemPriority;
  notes: string | null;
  effort_estimate: EffortEstimate | null;
  steps: Step[];
  status_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  canvas_token: string | null;
  canvas_base_url: string | null;
  canvas_calendar_url: string | null;
  google_refresh_token: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  source: ItemSource;
  last_sync_at: string;
  next_page_token: string | null;
  status: 'success' | 'error';
  error_message: string | null;
  items_synced: number;
}

export interface CreateCalendarItemInput {
  title: string;
  description?: string | null;
  item_type: ItemType;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  all_day?: boolean;
  source?: ItemSource;
  source_id?: string | null;
  source_url?: string | null;
  course_name?: string | null;
  priority?: ItemPriority;
  notes?: string | null;
  effort_estimate?: EffortEstimate | null;
  steps?: Step[];
}

export interface UpdateCalendarItemInput extends Partial<CreateCalendarItemInput> {
  status?: ItemStatus;
  completed_at?: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Canvas API types
export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  start_at?: string;
  end_at?: string;
  enrollment_term_id: number;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  points_possible?: number;
  course_id: number;
  html_url: string;
  submission_types: string[];
}

export interface CanvasCalendarEvent {
  id: number;
  title: string;
  start_at: string;
  end_at?: string;
  description?: string;
  location_name?: string;
  context_code: string;
  workflow_state: string;
  html_url: string;
  all_day: boolean;
}

export interface CanvasSubmission {
  id: number;
  assignment_id: number;
  workflow_state: 'submitted' | 'graded' | 'unsubmitted' | 'pending_review';
  submitted_at: string | null;
  late: boolean;
  missing: boolean;
  grade: string | null;
}

export interface CategorizationRule {
  id: string;
  user_id: string;
  match_type: 'title_contains' | 'title_prefix' | 'source_id_prefix' | 'context_code';
  match_value: string;
  course_name: string;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export type BoardViewMode = 'by_course' | 'this_week';
