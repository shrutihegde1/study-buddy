import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllAssignments, convertToCalendarItem } from "@/lib/integrations/google-classroom";
import { getValidGoogleToken } from "@/lib/integrations/google-tokens";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = await getValidGoogleToken(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google not connected. Please connect Google in Settings." },
        { status: 401 }
      );
    }

    // Fetch all assignments from Google Classroom
    const courseData = await fetchAllAssignments(accessToken);

    let itemsSynced = 0;
    const errors: string[] = [];

    for (const { course, assignments } of courseData) {
      for (const assignment of assignments) {
        if (assignment.state !== "PUBLISHED") continue;

        const item = convertToCalendarItem(assignment, course.name);

        // Upsert the item (update if exists, insert if new)
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
          errors.push(`Failed to sync ${assignment.title}: ${error.message}`);
        } else {
          itemsSynced++;
        }
      }
    }

    // Log the sync
    await supabase.from("sync_logs").insert({
      user_id: user.id,
      source: "google_classroom",
      status: errors.length > 0 ? "error" : "success",
      error_message: errors.length > 0 ? errors.join("; ") : null,
      items_synced: itemsSynced,
    });

    return NextResponse.json({
      success: true,
      itemsSynced,
      coursesProcessed: courseData.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Classroom sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
