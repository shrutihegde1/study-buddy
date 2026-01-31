import type { GoogleClassroomCourse, GoogleClassroomCourseWork, CreateCalendarItemInput } from "@/types";

const CLASSROOM_API_BASE = "https://classroom.googleapis.com/v1";

export async function fetchCourses(accessToken: string): Promise<GoogleClassroomCourse[]> {
  const response = await fetch(`${CLASSROOM_API_BASE}/courses?courseStates=ACTIVE`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch courses");
  }

  const data = await response.json();
  return data.courses || [];
}

export async function fetchCourseWork(
  accessToken: string,
  courseId: string
): Promise<GoogleClassroomCourseWork[]> {
  const response = await fetch(
    `${CLASSROOM_API_BASE}/courses/${courseId}/courseWork?orderBy=dueDate desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch course work");
  }

  const data = await response.json();
  return data.courseWork || [];
}

export async function fetchAllAssignments(
  accessToken: string
): Promise<{ course: GoogleClassroomCourse; assignments: GoogleClassroomCourseWork[] }[]> {
  const courses = await fetchCourses(accessToken);

  const results = await Promise.all(
    courses.map(async (course) => {
      try {
        const assignments = await fetchCourseWork(accessToken, course.id);
        return { course, assignments };
      } catch (error) {
        console.error(`Failed to fetch assignments for course ${course.id}:`, error);
        return { course, assignments: [] };
      }
    })
  );

  return results;
}

export function convertToCalendarItem(
  courseWork: GoogleClassroomCourseWork,
  courseName: string
): CreateCalendarItemInput {
  let dueDate: string | null = null;

  if (courseWork.dueDate) {
    const { year, month, day } = courseWork.dueDate;
    const time = courseWork.dueTime || { hours: 23, minutes: 59 };
    dueDate = new Date(
      year,
      month - 1,
      day,
      time.hours || 23,
      time.minutes || 59
    ).toISOString();
  }

  const itemType = courseWork.workType === "ASSIGNMENT"
    ? "assignment"
    : courseWork.workType === "SHORT_ANSWER_QUESTION" || courseWork.workType === "MULTIPLE_CHOICE_QUESTION"
    ? "quiz"
    : "assignment";

  return {
    title: courseWork.title,
    description: courseWork.description || null,
    item_type: itemType,
    due_date: dueDate,
    all_day: false,
    source: "google_classroom",
    source_id: `${courseWork.courseId}_${courseWork.id}`,
    source_url: courseWork.alternateLink,
    course_name: courseName,
    priority: "medium",
  };
}
