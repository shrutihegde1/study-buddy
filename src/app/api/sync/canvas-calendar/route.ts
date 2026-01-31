import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanvasCalendarFeed } from "@/lib/integrations/ical-parser";
import { fetchCanvasCourses } from "@/lib/integrations/canvas";
import { applyRulesToInput } from "@/lib/categorization";
import type { CategorizationRule, CreateCalendarItemInput } from "@/types";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Canvas credentials (both calendar URL and API token)
    const { data: profile } = await supabase
      .from("profiles")
      .select("canvas_calendar_url, canvas_token, canvas_base_url")
      .eq("id", user.id)
      .single();

    if (!profile?.canvas_calendar_url) {
      return NextResponse.json(
        { error: "Canvas calendar URL not configured. Please add your calendar URL in settings." },
        { status: 400 }
      );
    }

    // If Canvas API credentials are available, fetch courses to build code → name mapping
    const courseCodeMap = new Map<string, string>();
    if (profile.canvas_token && profile.canvas_base_url) {
      try {
        const courses = await fetchCanvasCourses(profile.canvas_base_url, profile.canvas_token);
        for (const course of courses) {
          // Map course_code → course name (e.g. "SCI11200B" → "Biology Honors")
          if (course.course_code) {
            courseCodeMap.set(course.course_code.toLowerCase(), course.name);
          }
          // Also map by ID string
          courseCodeMap.set(String(course.id), course.name);
        }

        // Auto-create categorization rules from Canvas courses
        for (const course of courses) {
          if (course.course_code) {
            await supabase.from("categorization_rules").upsert(
              {
                user_id: user.id,
                match_type: "title_contains",
                match_value: course.course_code,
                course_name: course.name,
                auto_generated: true,
              },
              { onConflict: "user_id,match_type,match_value" }
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch Canvas courses for enrichment:", error);
      }
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
      // Try to resolve course name from bracket/paren codes in the title
      if (!item.course_name) {
        resolveFromTitleCodes(item, courseCodeMap);
      }

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
    await categorizeExistingItems(supabase, user.id, userRules, courseCodeMap);

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

/**
 * Extract course codes from bracket/paren suffixes in the title
 * e.g. "DNA Replication AoL #1 [SCI11200B]" → look up "SCI11200B" in courseCodeMap
 * e.g. "LD Research (1A Debate 1 S2 (Jones))" → look up section codes
 */
function resolveFromTitleCodes(
  item: CreateCalendarItemInput,
  courseCodeMap: Map<string, string>
): void {
  if (courseCodeMap.size === 0) return;

  // Try bracket patterns anywhere in title: [CODE]
  const bracketMatches = item.title.match(/\[([^\]]+)\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      const code = match.slice(1, -1); // Remove [ and ]
      const courseName = courseCodeMap.get(code.toLowerCase());
      if (courseName) {
        item.course_name = courseName;
        // Clean up title by removing the bracket code
        item.title = item.title.replace(match, "").trim();
        return;
      }
    }
  }

  // Try paren patterns: (CODE)
  const parenMatches = item.title.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const match of parenMatches) {
      const code = match.slice(1, -1);
      const courseName = courseCodeMap.get(code.toLowerCase());
      if (courseName) {
        item.course_name = courseName;
        item.title = item.title.replace(match, "").trim();
        return;
      }
    }
  }

  // Partial match: check if any course code appears as a substring in the title
  for (const [code, name] of courseCodeMap) {
    if (code.length >= 4 && item.title.toLowerCase().includes(code)) {
      item.course_name = name;
      return;
    }
  }
}

async function categorizeExistingItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rules: CategorizationRule[],
  courseCodeMap: Map<string, string>
) {
  // Fetch all uncategorized items
  const { data: uncategorized } = await supabase
    .from("calendar_items")
    .select("id, title, source_id")
    .eq("user_id", userId)
    .is("course_name", null);

  if (!uncategorized || uncategorized.length === 0) return;

  for (const item of uncategorized) {
    const input = {
      title: item.title,
      source_id: item.source_id,
      course_name: null as string | null,
    } as CreateCalendarItemInput;

    // Try courseCodeMap first
    resolveFromTitleCodes(input, courseCodeMap);

    // Then try rules + heuristics
    if (!input.course_name) {
      applyRulesToInput(input, rules);
    }

    if (input.course_name) {
      await supabase
        .from("calendar_items")
        .update({ course_name: input.course_name })
        .eq("id", item.id);
    }
  }
}
