import type {
  CanvasCourse,
  CanvasAssignment,
  CanvasCalendarEvent,
  CanvasSubmission,
  CreateCalendarItemInput
} from "@/types";

export async function fetchCanvasCourses(
  baseUrl: string,
  token: string
): Promise<CanvasCourse[]> {
  const response = await fetch(
    `${baseUrl}/api/v1/courses?enrollment_state=active&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas courses: ${error}`);
  }

  return response.json();
}

export async function fetchCanvasAssignments(
  baseUrl: string,
  token: string,
  courseId: number
): Promise<CanvasAssignment[]> {
  const response = await fetch(
    `${baseUrl}/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas assignments: ${error}`);
  }

  return response.json();
}

export async function fetchCanvasCalendarEvents(
  baseUrl: string,
  token: string
): Promise<CanvasCalendarEvent[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const response = await fetch(
    `${baseUrl}/api/v1/calendar_events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas calendar events: ${error}`);
  }

  return response.json();
}

export async function fetchCanvasTodoItems(
  baseUrl: string,
  token: string
): Promise<CanvasAssignment[]> {
  const response = await fetch(`${baseUrl}/api/v1/users/self/todo`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas todo items: ${error}`);
  }

  const todos = await response.json();
  return todos.map((todo: { assignment: CanvasAssignment }) => todo.assignment).filter(Boolean);
}

export async function fetchCanvasSubmissions(
  baseUrl: string,
  token: string,
  courseId: number
): Promise<CanvasSubmission[]> {
  const response = await fetch(
    `${baseUrl}/api/v1/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas submissions: ${error}`);
  }

  return response.json();
}

export async function fetchAllCanvasData(
  baseUrl: string,
  token: string
): Promise<{
  courses: CanvasCourse[];
  assignments: { course: CanvasCourse; assignments: CanvasAssignment[] }[];
  calendarEvents: CanvasCalendarEvent[];
  courseMap: Map<string, string>;
}> {
  const courses = await fetchCanvasCourses(baseUrl, token);

  // Build courseMap: numeric ID string → course name
  const courseMap = new Map<string, string>();
  for (const course of courses) {
    courseMap.set(String(course.id), course.name);
  }

  const assignmentsByCoures = await Promise.all(
    courses.map(async (course) => {
      try {
        const assignments = await fetchCanvasAssignments(baseUrl, token, course.id);
        return { course, assignments };
      } catch (error) {
        console.error(`Failed to fetch assignments for course ${course.id}:`, error);
        return { course, assignments: [] };
      }
    })
  );

  let calendarEvents: CanvasCalendarEvent[] = [];
  try {
    calendarEvents = await fetchCanvasCalendarEvents(baseUrl, token);
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
  }

  return {
    courses,
    assignments: assignmentsByCoures,
    calendarEvents,
    courseMap,
  };
}

export function convertAssignmentToCalendarItem(
  assignment: CanvasAssignment,
  courseName: string
): CreateCalendarItemInput {
  // Determine item type based on submission types
  let itemType: "assignment" | "quiz" | "test" = "assignment";
  if (assignment.submission_types?.includes("online_quiz")) {
    itemType = "quiz";
  }

  return {
    title: assignment.name,
    description: assignment.description || null,
    item_type: itemType,
    due_date: assignment.due_at || null,
    all_day: false,
    source: "canvas",
    source_id: `assignment_${assignment.id}`,
    source_url: assignment.html_url,
    course_name: courseName,
    priority: "medium",
  };
}

export function convertEventToCalendarItem(
  event: CanvasCalendarEvent,
  courseMap?: Map<string, string>
): CreateCalendarItemInput {
  // Resolve context_code (e.g. "course_123") to actual course name via courseMap
  let courseName: string | null = null;
  if (event.context_code) {
    const numericId = event.context_code.replace("course_", "");
    courseName = courseMap?.get(numericId) || null;
  }

  return {
    title: event.title,
    description: event.description || null,
    item_type: "activity",
    start_time: event.start_at,
    end_time: event.end_at || null,
    all_day: event.all_day,
    source: "canvas",
    source_id: `event_${event.id}`,
    source_url: event.html_url,
    course_name: courseName,
    priority: "medium",
  };
}

export async function validateCanvasToken(
  baseUrl: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
