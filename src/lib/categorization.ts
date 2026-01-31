import type { CalendarItem, CategorizationRule } from "@/types";

/**
 * Match a single item against user-defined rules.
 * Returns the matched course_name or null.
 */
export function applyRules(
  item: CalendarItem,
  rules: CategorizationRule[]
): string | null {
  for (const rule of rules) {
    switch (rule.match_type) {
      case "title_contains":
        if (item.title.toLowerCase().includes(rule.match_value.toLowerCase())) {
          return rule.course_name;
        }
        break;
      case "title_prefix":
        if (item.title.toLowerCase().startsWith(rule.match_value.toLowerCase())) {
          return rule.course_name;
        }
        break;
      case "source_id_prefix":
        if (item.source_id?.startsWith(rule.match_value)) {
          return rule.course_name;
        }
        break;
      case "context_code":
        // context_code rules are handled during sync; skip here
        break;
    }
  }
  return null;
}

/**
 * Conservative regex heuristics to infer course name from text.
 * Matches patterns like: CS 201, MATH101, BIO 101, [PHYS 202], "Course Name:" prefix.
 */
export function inferCourseFromText(text: string): string | null {
  if (!text) return null;

  // Match patterns like "CS 201", "MATH101", "BIO 101", "ENG 102A"
  const courseCodeRegex = /\b([A-Z]{2,5})\s?(\d{3}[A-Z]?)\b/;
  const match = text.match(courseCodeRegex);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }

  // Match bracketed patterns like "[BIO 101]" or "[CS201]"
  const bracketRegex = /\[([A-Z]{2,5}\s?\d{3}[A-Z]?)\]/;
  const bracketMatch = text.match(bracketRegex);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  return null;
}

/**
 * For each uncategorized item, try rules first, then heuristics.
 * Returns a Map of itemId → suggested course name.
 */
export function categorizeItems(
  items: CalendarItem[],
  rules: CategorizationRule[]
): Map<string, string> {
  const suggestions = new Map<string, string>();

  for (const item of items) {
    // Only suggest for uncategorized items
    if (item.course_name) continue;

    // Try rules first
    const ruleMatch = applyRules(item, rules);
    if (ruleMatch) {
      suggestions.set(item.id, ruleMatch);
      continue;
    }

    // Try heuristic inference from title
    const inferred = inferCourseFromText(item.title);
    if (inferred) {
      suggestions.set(item.id, inferred);
    }
  }

  return suggestions;
}
