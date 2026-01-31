import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAllCanvasData,
  fetchCanvasSubmissions,
  convertAssignmentToCalendarItem,
  convertEventToCalendarItem,
} from "@/lib/integrations/canvas";
import { applyRulesToInput } from "@/lib/categorization";
import type { CanvasSubmission, CategorizationRule } from "@/types";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Canvas credentials
    const { data: profile } = await supabase
      .from("profiles")
      .select("canvas_token, canvas_base_url")
      .eq("id", user.id)
      .single();

    if (!profile?.canvas_token || !profile?.canvas_base_url) {
      return NextResponse.json(
        { error: "Canvas not configured. Please add your Canvas token in settings." },
        { status: 400 }
      );
    }

    // Fetch all Canvas data
    const { courses, assignments, calendarEvents, courseMap } = await fetchAllCanvasData(
      profile.canvas_base_url,
      profile.canvas_token
    );

    // Fetch submissions per course, build submissionMap: assignment_id → submission
    const submissionMap = new Map<number, CanvasSubmission>();
    for (const course of courses) {
      try {
        const submissions = await fetchCanvasSubmissions(
          profile.canvas_base_url,
          profile.canvas_token,
          course.id
        );
        for (const sub of submissions) {
          submissionMap.set(sub.assignment_id, sub);
        }
      } catch (error) {
        console.error(`Failed to fetch submissions for course ${course.id}:`, error);
      }
    }

    let itemsSynced = 0;
    const errors: string[] = [];

    // Auto-create categorization_rules for each context_code → course_name mapping
    for (const course of courses) {
      const contextCode = `course_${course.id}`;
      await supabase.from("categorization_rules").upsert(
        {
          user_id: user.id,
          match_type: "context_code",
          match_value: contextCode,
          course_name: course.name,
          auto_generated: true,
        },
        {
          onConflict: "user_id,match_type,match_value",
        }
      );
    }

    // Sync assignments
    for (const { course, assignments: courseAssignments } of assignments) {
      for (const assignment of courseAssignments) {
        const item = convertAssignmentToCalendarItem(assignment, course.name);

        // Determine status from submissions
        const submission = submissionMap.get(assignment.id);
        let status: string | undefined;
        let completedAt: string | null | undefined;

        if (submission) {
          const ws = submission.workflow_state;
          if (ws === "submitted" || ws === "graded" || ws === "pending_review") {
            status = "completed";
            completedAt = submission.submitted_at || new Date().toISOString();
          }
        }

        // Check if item already exists and has status_locked
        const { data: existingItem } = await supabase
          .from("calendar_items")
          .select("id, status_locked")
          .eq("user_id", user.id)
          .eq("source", "canvas")
          .eq("source_id", `assignment_${assignment.id}`)
          .maybeSingle();

        const upsertData: Record<string, unknown> = {
          ...item,
          user_id: user.id,
        };

        // Only set status if not locked by user
        if (status && (!existingItem || !existingItem.status_locked)) {
          upsertData.status = status;
          upsertData.completed_at = completedAt;
        }

        const { error } = await supabase.from("calendar_items").upsert(
          upsertData,
          {
            onConflict: "user_id,source,source_id",
          }
        );

        if (error) {
          errors.push(`Failed to sync ${assignment.name}: ${error.message}`);
        } else {
          itemsSynced++;
        }
      }
    }

    // Sync calendar events
    for (const event of calendarEvents) {
      const item = convertEventToCalendarItem(event, courseMap);

      const { error } = await supabase.from("calendar_items").upsert(
        {
          ...item,
          user_id: user.id,
        },
        {
          onConflict: "user_id,source,source_id",
        }
      );

      if (error) {
        errors.push(`Failed to sync event ${event.title}: ${error.message}`);
      } else {
        itemsSynced++;
      }
    }

    // Retroactively categorize existing uncategorized items using all rules
    const { data: allRules } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id);

    await categorizeExistingItems(supabase, user.id, (allRules || []) as CategorizationRule[]);

    // Log the sync
    await supabase.from("sync_logs").insert({
      user_id: user.id,
      source: "canvas",
      status: errors.length > 0 ? "error" : "success",
      error_message: errors.length > 0 ? errors.join("; ") : null,
      items_synced: itemsSynced,
    });

    return NextResponse.json({
      success: true,
      itemsSynced,
      coursesProcessed: assignments.length,
      eventsProcessed: calendarEvents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Canvas sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

async function categorizeExistingItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rules: CategorizationRule[]
) {
  const { data: uncategorized } = await supabase
    .from("calendar_items")
    .select("id, title, source_id")
    .eq("user_id", userId)
    .is("course_name", null);

  if (!uncategorized || uncategorized.length === 0) return;

  for (const item of uncategorized) {
    const input = { title: item.title, source_id: item.source_id } as { title: string; source_id?: string | null; course_name?: string | null };
    applyRulesToInput(input as any, rules);
    if (input.course_name) {
      await supabase
        .from("calendar_items")
        .update({ course_name: input.course_name })
        .eq("id", item.id);
    }
  }
}
