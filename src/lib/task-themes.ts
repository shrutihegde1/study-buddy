import type { CalendarItem } from "@/types";

// ---------------------------------------------------------------------------
// Layer 1 — Seed vocabulary (ordered longest-match-first)
// ---------------------------------------------------------------------------

const SEED_PATTERNS: [RegExp, string][] = [
  // Multi-word phrases first
  [/\bprogress\s+check\b/i, "Progress Check"],
  [/\blab\s+report\b/i, "Lab Report"],
  [/\bstudy\s+guide\b/i, "Study Guide"],
  [/\bvocab\s+quiz\b/i, "Vocab Quiz"],
  [/\bunit\s+test\b/i, "Unit Test"],
  [/\bbook\s+report\b/i, "Book Report"],
  [/\bgroup\s+project\b/i, "Group Project"],
  [/\bfinal\s+exam\b/i, "Final Exam"],
  [/\bclass\s+discussion\b/i, "Discussion"],
  [/\bpeer\s+review\b/i, "Peer Review"],
  [/\bopen\s+note\b/i, "Open Note"],

  // Single-word / abbreviation patterns
  [/\bAoL\b/, "AoL"],
  [/\bQuiz\b/i, "Quiz"],
  [/\bTest\b/i, "Test"],
  [/\bExam\b/i, "Exam"],
  [/\bMidterm\b/i, "Midterm"],
  [/\bFinal\b/i, "Final"],
  [/\bHomework\b/i, "Homework"],
  [/\bWorksheet\b/i, "Worksheet"],
  [/\bLab\b/i, "Lab"],
  [/\bProject\b/i, "Project"],
  [/\bPresentation\b/i, "Presentation"],
  [/\bEssay\b/i, "Essay"],
  [/\bDiscussion\b/i, "Discussion"],
  [/\bDebate\b/i, "Debate"],
  [/\bJournal\b/i, "Journal"],
  [/\bReview\b/i, "Review"],
  [/\bPractice\b/i, "Practice"],
  [/\bActivity\b/i, "Activity"],
  [/\bExercise\b/i, "Exercise"],
  [/\bDrill\b/i, "Drill"],
  [/\bVocabulary\b/i, "Vocabulary"],
  [/\bSummative\b/i, "Summative"],
  [/\bFormative\b/i, "Formative"],
  [/\bAssessment\b/i, "Assessment"],
  [/\bAssignment\b/i, "Assignment"],
  [/\bCheckpoint\b/i, "Checkpoint"],
  [/\bBellwork\b/i, "Bellwork"],
  [/\bWarmup\b/i, "Warmup"],
  [/\bSeminar\b/i, "Seminar"],
];

// ---------------------------------------------------------------------------
// extractTaskTheme — Layer 1 lookup
// ---------------------------------------------------------------------------

/**
 * Scan the title against the seed vocabulary and return the first match,
 * or `null` if nothing matches.
 */
export function extractTaskTheme(title: string): string | null {
  for (const [pattern, label] of SEED_PATTERNS) {
    if (pattern.test(title)) return label;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Layer 2 — Cross-course frequency analysis
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "not", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "shall", "should", "may", "might", "must", "can",
  "could", "unit", "chapter", "section", "part", "page", "week", "day",
  "due", "grade", "period", "semester", "quarter", "block", "class", "name",
]);

/**
 * Tokenize a title into candidate theme words:
 * - Strip numbers and short punctuation tokens
 * - Remove stop words
 */
function tokenize(title: string): string[] {
  return title
    .split(/[\s/\-–—:,;()\[\]]+/)
    .map((t) => t.replace(/[^a-zA-Z]/g, ""))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t.toLowerCase()));
}

/**
 * Analyse all items to discover task-type words that appear across 2+
 * distinct courses — a strong signal the word is a task type rather than
 * course-specific content.
 *
 * Returns a de-duplicated array of all theme labels (seed + discovered).
 */
export function discoverThemes(items: CalendarItem[]): string[] {
  const seedThemes = new Set<string>();
  // word (lowercased) → set of course_name values it appears in
  const wordCourses = new Map<string, Set<string>>();
  // word (lowercased) → representative cased form
  const wordCasing = new Map<string, string>();

  for (const item of items) {
    const seed = extractTaskTheme(item.title);
    if (seed) {
      seedThemes.add(seed);
      continue; // already categorised — no need to tokenize
    }

    const course = item.course_name ?? "__uncategorized__";
    for (const token of tokenize(item.title)) {
      const key = token.toLowerCase();
      if (!wordCourses.has(key)) {
        wordCourses.set(key, new Set());
        wordCasing.set(key, token);
      }
      wordCourses.get(key)!.add(course);
    }
  }

  // Words appearing in 2+ courses are likely task types
  const discovered: string[] = [];
  for (const [key, courses] of wordCourses) {
    if (courses.size >= 2) {
      discovered.push(wordCasing.get(key)!);
    }
  }

  return [...seedThemes, ...discovered];
}

// ---------------------------------------------------------------------------
// Deterministic colour generation
// ---------------------------------------------------------------------------

const THEME_PALETTE = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
  "#6366f1", // indigo
  "#06b6d4", // cyan
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Return a deterministic colour from the palette for any theme string.
 * Unknown/new themes always get a consistent colour without configuration.
 */
export function getThemeColor(theme: string): string {
  return THEME_PALETTE[hashString(theme) % THEME_PALETTE.length];
}
