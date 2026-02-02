import type {
  CanvasCourse,
  CanvasAssignment,
  CanvasCalendarEvent,
  CanvasPlannerItem,
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
    `${baseUrl}/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=observed_users`,
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

export async function fetchCanvasPlannerItems(
  baseUrl: string,
  token: string
): Promise<CanvasPlannerItem[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const response = await fetch(
    `${baseUrl}/api/v1/planner/items?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Canvas planner items: ${error}`);
  }

  return response.json();
}

/**
 * Fetch the list of users being observed (for parent/observer accounts).
 */
export async function fetchCanvasObservees(
  baseUrl: string,
  token: string
): Promise<{ id: number; name: string }[]> {
  const response = await fetch(
    `${baseUrl}/api/v1/users/self/observees?per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Fetch assignment-type calendar events with pagination.
 * This works for observer accounts because the calendar API
 * respects observer visibility into observed students' assignments.
 */
export async function fetchCanvasAssignmentEvents(
  baseUrl: string,
  token: string,
  contextCodes: string[]
): Promise<CanvasCalendarEvent[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const contextParams = contextCodes
    .map((code) => `context_codes[]=${encodeURIComponent(code)}`)
    .join("&");

  const allEvents: CanvasCalendarEvent[] = [];
  let url: string | null =
    `${baseUrl}/api/v1/calendar_events?type=assignment&all_events=1&${contextParams}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Canvas assignment events: ${error}`);
    }

    const events: CanvasCalendarEvent[] = await response.json();
    allEvents.push(...events);

    // Parse Link header for next page
    const linkHeader = response.headers.get("Link");
    url = parseLinkHeaderNext(linkHeader);
  }

  return allEvents;
}

/**
 * Parse the "next" URL from a Canvas API Link header.
 * Format: <https://...?page=2&per_page=100>; rel="next", <...>; rel="last"
 */
function parseLinkHeaderNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
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

  let assignmentsByCourse = await Promise.all(
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

  // Check if standard assignments endpoint returned anything
  const totalAssignments = assignmentsByCourse.reduce(
    (sum, { assignments }) => sum + assignments.length,
    0
  );

  // Fallback strategies for observer/parent accounts
  if (totalAssignments === 0) {
    console.log("[Canvas] Standard assignments returned 0, trying fallback strategies...");

    // Strategy 1: Planner items API
    let foundViaPlanner = false;
    try {
      const plannerItems = await fetchCanvasPlannerItems(baseUrl, token);
      console.log(
        `[Canvas] Planner returned ${plannerItems.length} items, types: ${[...new Set(plannerItems.map((i) => i.plannable_type))].join(", ") || "none"}`
      );

      const assignmentItems = plannerItems.filter(
        (item) =>
          item.plannable_type === "assignment" ||
          item.plannable_type === "quiz" ||
          item.plannable_type === "discussion_topic"
      );

      if (assignmentItems.length > 0) {
        const byCourse = new Map<number, CanvasAssignment[]>();
        for (const item of assignmentItems) {
          const courseId = item.course_id;
          if (!byCourse.has(courseId)) byCourse.set(courseId, []);

          const htmlUrl = item.plannable.html_url
            ? item.plannable.html_url.startsWith("http")
              ? item.plannable.html_url
              : `${baseUrl}${item.plannable.html_url}`
            : `${baseUrl}${item.html_url}`;

          byCourse.get(courseId)!.push({
            id: item.plannable_id,
            name: item.plannable.title,
            description: item.plannable.description,
            due_at: item.plannable.due_at || item.plannable_date || undefined,
            points_possible: item.plannable.points_possible,
            course_id: courseId,
            html_url: htmlUrl,
            submission_types: item.plannable.submission_types || [],
          });
        }

        assignmentsByCourse = courses.map((course) => ({
          course,
          assignments: byCourse.get(course.id) || [],
        }));
        foundViaPlanner = true;
        console.log(`[Canvas] Planner fallback: ${assignmentItems.length} assignment items`);
      }
    } catch (error) {
      console.error("[Canvas] Planner items fallback failed:", error);
    }

    // Strategy 2: Calendar events with type=assignment (works for observers)
    if (!foundViaPlanner) {
      try {
        const contextCodes = courses.map((c) => `course_${c.id}`);
        const assignmentEvents = await fetchCanvasAssignmentEvents(
          baseUrl,
          token,
          contextCodes
        );
        console.log(
          `[Canvas] Calendar assignment events returned ${assignmentEvents.length} items`
        );

        if (assignmentEvents.length > 0) {
          const byCourse = new Map<number, CanvasAssignment[]>();
          for (const event of assignmentEvents) {
            // Extract course_id from context_code (e.g. "course_123")
            const courseIdStr = event.context_code?.replace("course_", "");
            const courseId = courseIdStr ? parseInt(courseIdStr, 10) : 0;
            if (!courseId) continue;
            if (!byCourse.has(courseId)) byCourse.set(courseId, []);

            // Extract assignment ID from event id or html_url
            const assignmentIdMatch = event.html_url?.match(/assignments\/(\d+)/);
            const assignmentId = assignmentIdMatch
              ? parseInt(assignmentIdMatch[1], 10)
              : event.id;

            byCourse.get(courseId)!.push({
              id: assignmentId,
              name: event.title,
              description: event.description,
              due_at: event.start_at || undefined,
              course_id: courseId,
              html_url: event.html_url,
              submission_types: [],
            });
          }

          assignmentsByCourse = courses.map((course) => ({
            course,
            assignments: byCourse.get(course.id) || [],
          }));
          console.log(
            `[Canvas] Calendar assignment fallback: ${assignmentEvents.length} items across ${byCourse.size} courses`
          );
        }
      } catch (error) {
        console.error("[Canvas] Calendar assignment events fallback failed:", error);
      }
    }

    // Strategy 3: Check if user is an observer and fetch observee info
    if (
      assignmentsByCourse.reduce((s, a) => s + a.assignments.length, 0) === 0
    ) {
      try {
        const observees = await fetchCanvasObservees(baseUrl, token);
        if (observees.length > 0) {
          console.log(
            `[Canvas] Observer account detected. Observing: ${observees.map((o) => o.name).join(", ")}. Trying observee planner...`
          );
          // Try planner items for each observee
          for (const observee of observees) {
            try {
              const startDate = new Date();
              startDate.setMonth(startDate.getMonth() - 3);
              const endDate = new Date();
              endDate.setMonth(endDate.getMonth() + 6);

              const response = await fetch(
                `${baseUrl}/api/v1/planner/items?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100&observed_user_id=${observee.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (!response.ok) {
                console.log(`[Canvas] Observee ${observee.id} planner: ${response.status}`);
                continue;
              }

              const items: CanvasPlannerItem[] = await response.json();
              console.log(
                `[Canvas] Observee ${observee.name} planner: ${items.length} items, types: ${[...new Set(items.map((i) => i.plannable_type))].join(", ") || "none"}`
              );

              const assignmentItems = items.filter(
                (item) =>
                  item.plannable_type === "assignment" ||
                  item.plannable_type === "quiz" ||
                  item.plannable_type === "discussion_topic"
              );

              if (assignmentItems.length > 0) {
                const byCourse = new Map<number, CanvasAssignment[]>();
                for (const item of assignmentItems) {
                  const courseId = item.course_id;
                  if (!byCourse.has(courseId)) byCourse.set(courseId, []);

                  const htmlUrl = item.plannable.html_url
                    ? item.plannable.html_url.startsWith("http")
                      ? item.plannable.html_url
                      : `${baseUrl}${item.plannable.html_url}`
                    : `${baseUrl}${item.html_url}`;

                  byCourse.get(courseId)!.push({
                    id: item.plannable_id,
                    name: item.plannable.title,
                    description: item.plannable.description,
                    due_at:
                      item.plannable.due_at || item.plannable_date || undefined,
                    points_possible: item.plannable.points_possible,
                    course_id: courseId,
                    html_url: htmlUrl,
                    submission_types: item.plannable.submission_types || [],
                  });
                }

                assignmentsByCourse = courses.map((course) => ({
                  course,
                  assignments: byCourse.get(course.id) || [],
                }));
                console.log(
                  `[Canvas] Observee planner fallback: ${assignmentItems.length} items`
                );
                break; // Found items for an observee, stop
              }
            } catch (err) {
              console.error(
                `[Canvas] Failed to fetch planner for observee ${observee.id}:`,
                err
              );
            }
          }
        } else {
          console.log("[Canvas] No observees found — not an observer account, or API returned empty");
        }
      } catch (error) {
        console.error("[Canvas] Observee detection failed:", error);
      }
    }
  }

  let calendarEvents: CanvasCalendarEvent[] = [];
  try {
    calendarEvents = await fetchCanvasCalendarEvents(baseUrl, token);
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
  }

  return {
    courses,
    assignments: assignmentsByCourse,
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
