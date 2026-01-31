import type { CreateCalendarItemInput } from "@/types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/v1";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body?: { data?: string } }[];
  };
  internalDate: string;
}

export async function searchCanvasEmails(accessToken: string): Promise<GmailMessage[]> {
  // Search for Canvas notification emails
  const query = "from:notifications@instructure.com OR from:canvas@instructure.com";

  const searchResponse = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error("Failed to search emails");
  }

  const searchData = await searchResponse.json();
  const messageIds = searchData.messages || [];

  // Fetch full message details
  const messages = await Promise.all(
    messageIds.slice(0, 20).map(async ({ id }: { id: string }) => {
      const response = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) return null;
      return response.json();
    })
  );

  return messages.filter(Boolean) as GmailMessage[];
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function getHeader(message: GmailMessage, name: string): string | undefined {
  return message.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

function getMessageBody(message: GmailMessage): string {
  // Try to get body from parts first (multipart message)
  if (message.payload.parts) {
    const textPart = message.payload.parts.find(
      (p) => p.mimeType === "text/plain" || p.mimeType === "text/html"
    );
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
  }

  // Fall back to direct body
  if (message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }

  return "";
}

export function parseCanvasEmail(message: GmailMessage): CreateCalendarItemInput | null {
  const subject = getHeader(message, "Subject") || "";
  const body = getMessageBody(message);
  const date = new Date(parseInt(message.internalDate));

  // Pattern matching for different Canvas notification types
  const patterns = {
    newAssignment: /new assignment[:\s]+(.+?)(?:\s+was created|\s+has been added)/i,
    dueDateChanged: /due date.*?changed.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
    gradePosted: /grade.*?posted.*?for\s+(.+)/i,
    newQuiz: /new quiz[:\s]+(.+?)(?:\s+is available|\s+has been posted)/i,
    announcement: /announcement.*?for\s+(.+)/i,
  };

  // Try to extract assignment/quiz info
  let title = subject;
  let itemType: "assignment" | "quiz" | "test" | "activity" = "assignment";
  let dueDate: string | null = null;

  // Check for quiz
  if (/quiz/i.test(subject) || /quiz/i.test(body)) {
    itemType = "quiz";
  }

  // Check for test/exam
  if (/\b(test|exam|midterm|final)\b/i.test(subject) || /\b(test|exam|midterm|final)\b/i.test(body)) {
    itemType = "test";
  }

  // Try to extract due date from body
  const dueDateMatch = body.match(/due[:\s]+(\w+\s+\d{1,2},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
  if (dueDateMatch) {
    try {
      const parsedDate = new Date(dueDateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Extract course name from subject or body
  const courseMatch = subject.match(/\[(.+?)\]/) || body.match(/course[:\s]+(.+?)(?:\n|<)/i);
  const courseName = courseMatch ? courseMatch[1].trim() : null;

  // Clean up title
  title = title.replace(/\[.+?\]/g, "").replace(/^(Re|Fwd):\s*/i, "").trim();

  if (!title) return null;

  return {
    title,
    description: message.snippet,
    item_type: itemType,
    due_date: dueDate,
    all_day: false,
    source: "gmail",
    source_id: message.id,
    source_url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
    course_name: courseName,
    priority: "medium",
  };
}

export async function parseCanvasNotifications(
  accessToken: string
): Promise<CreateCalendarItemInput[]> {
  const messages = await searchCanvasEmails(accessToken);

  const items: CreateCalendarItemInput[] = [];

  for (const message of messages) {
    const item = parseCanvasEmail(message);
    if (item) {
      items.push(item);
    }
  }

  return items;
}
