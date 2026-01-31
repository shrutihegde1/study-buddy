import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanvasNotifications } from "@/lib/integrations/gmail-parser";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's session to access the provider token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      return NextResponse.json(
        { error: "Google access token not available. Please re-authenticate." },
        { status: 401 }
      );
    }

    const accessToken = session.provider_token;

    // Parse Canvas notifications from Gmail
    const items = await parseCanvasNotifications(accessToken);

    let itemsSynced = 0;
    const errors: string[] = [];

    for (const item of items) {
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
