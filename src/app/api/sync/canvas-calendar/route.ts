import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanvasCalendarFeed } from "@/lib/integrations/ical-parser";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Canvas calendar URL
    const { data: profile } = await supabase
      .from("profiles")
      .select("canvas_calendar_url")
      .eq("id", user.id)
      .single();

    if (!profile?.canvas_calendar_url) {
      return NextResponse.json(
        { error: "Canvas calendar URL not configured. Please add your calendar URL in settings." },
        { status: 400 }
      );
    }

    // Parse the calendar feed
    const items = await parseCanvasCalendarFeed(profile.canvas_calendar_url);

    let itemsSynced = 0;
    const errors: string[] = [];

    for (const item of items) {
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
        errors.push(`Failed to sync ${item.title}: ${error.message}`);
      } else {
        itemsSynced++;
      }
    }

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
      totalEvents: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Canvas calendar sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
