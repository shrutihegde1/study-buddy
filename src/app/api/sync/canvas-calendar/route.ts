import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanvasCalendarFeed } from "@/lib/integrations/ical-parser";
import { applyRulesToInput } from "@/lib/categorization";
import type { CategorizationRule } from "@/types";

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

    // Fetch user's categorization rules to apply during sync
    const { data: rules } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id);

    const userRules = (rules || []) as CategorizationRule[];

    // Parse the calendar feed
    const items = await parseCanvasCalendarFeed(profile.canvas_calendar_url);

    let itemsSynced = 0;
    const errors: string[] = [];

    for (const item of items) {
      // Apply categorization rules if course_name is still null
      if (!item.course_name) {
        applyRulesToInput(item, userRules);
      }

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

    // Retroactively categorize existing uncategorized items
    await categorizeExistingItems(supabase, user.id, userRules);

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

async function categorizeExistingItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rules: CategorizationRule[]
) {
  // Fetch all uncategorized items
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
