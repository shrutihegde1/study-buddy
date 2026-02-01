import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanvasNotifications } from "@/lib/integrations/gmail-parser";
import { applyRulesToInput } from "@/lib/categorization";
import { getValidGoogleToken } from "@/lib/integrations/google-tokens";
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

    const accessToken = await getValidGoogleToken(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google not connected. Please connect Google in Settings." },
        { status: 401 }
      );
    }

    // Fetch user's categorization rules to apply during sync
    const { data: rules } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id);

    const userRules = (rules || []) as CategorizationRule[];

    // Parse Canvas notifications from Gmail
    const items = await parseCanvasNotifications(accessToken);

    let itemsSynced = 0;
    const errors: string[] = [];

    for (const item of items) {
      // Apply categorization rules if course_name is still null
      if (!item.course_name) {
        applyRulesToInput(item, userRules);
      }

      // Upsert the item
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
      source: "gmail",
      status: errors.length > 0 ? "error" : "success",
      error_message: errors.length > 0 ? errors.join("; ") : null,
      items_synced: itemsSynced,
    });

    return NextResponse.json({
      success: true,
      itemsSynced,
      emailsProcessed: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Gmail sync error:", error);
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
    .select("id, title, source_id, source_url")
    .eq("user_id", userId)
    .is("course_name", null);

  if (!uncategorized || uncategorized.length === 0) return;

  for (const item of uncategorized) {
    const input = { title: item.title, source_id: item.source_id, source_url: item.source_url } as { title: string; source_id?: string | null; source_url?: string | null; course_name?: string | null };
    applyRulesToInput(input as any, rules);
    if (input.course_name) {
      await supabase
        .from("calendar_items")
        .update({ course_name: input.course_name })
        .eq("id", item.id);
    }
  }
}
