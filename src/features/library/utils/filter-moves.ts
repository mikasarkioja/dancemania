/**
 * Client-side filtering for the dance library by role, category, difficulty,
 * and text search over label/tags. Keeps payload small and results instant.
 */

import type {
  DanceLibraryItem,
  InstructionMarker,
  MoveSegment,
  MoveRole,
} from "@/types/dance";

const DEFAULT_ROLE: MoveRole = "Both";
const DEFAULT_CATEGORY = "";
const DEFAULT_DIFFICULTY = 0;
const DEFAULT_MECHANICS: InstructionMarker["mechanics"] = {};

/** Normalize a stored MoveSegment to InstructionMarker with defaults. */
export function toInstructionMarker(seg: MoveSegment): InstructionMarker {
  return {
    ...seg,
    role: seg.role ?? DEFAULT_ROLE,
    category: seg.category ?? DEFAULT_CATEGORY,
    difficulty: typeof seg.difficulty === "number" ? seg.difficulty : DEFAULT_DIFFICULTY,
    mechanics: seg.mechanics ?? DEFAULT_MECHANICS,
    label: seg.pattern,
    tags: seg.tags ?? [seg.pattern, seg.teacherInstruction].filter(Boolean),
  };
}

/** Fields to search for text (label + tags joined). */
function getSearchableText(marker: InstructionMarker): string {
  const label = marker.label ?? marker.pattern;
  const tags = Array.isArray(marker.tags) ? marker.tags.join(" ") : "";
  return `${label} ${marker.pattern} ${marker.teacherInstruction} ${tags}`.toLowerCase();
}

/**
 * Returns true if the marker matches the search query (substring match, case-insensitive).
 */
export function matchesTextSearch(
  marker: InstructionMarker,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true;
  const text = getSearchableText(marker);
  const terms = searchQuery.trim().toLowerCase().split(/\s+/);
  return terms.every((term) => text.includes(term));
}

export interface LibraryFilters {
  role?: MoveRole | null;
  category?: string | null;
  minDifficulty?: number | null;
  maxDifficulty?: number | null;
  searchQuery?: string | null;
}

/**
 * Filter the dance library by role, category, difficulty range, and text search.
 * Returns items with only segments that match; items with no matching segments are excluded.
 * All filtering is client-side for instant results.
 */
export function filterDanceLibrary(
  items: DanceLibraryItem[],
  filters: LibraryFilters
): DanceLibraryItem[] {
  const role = filters.role ?? null;
  const category = filters.category ?? null;
  const minDiff = filters.minDifficulty ?? null;
  const maxDiff = filters.maxDifficulty ?? null;
  const search = (filters.searchQuery ?? "").trim();

  return items
    .map((item) => {
      const markers: InstructionMarker[] = (item.instructions ?? [])
        .map(toInstructionMarker)
        .filter((m) => {
          if (role != null && role !== "Both") {
            if (m.role !== role && m.role !== "Both") return false;
          }
          if (category != null && category !== "" && m.category !== category)
            return false;
          if (minDiff != null && m.difficulty < minDiff) return false;
          if (maxDiff != null && m.difficulty > maxDiff) return false;
          if (search && !matchesTextSearch(m, search)) return false;
          return true;
        });
      return { ...item, instructions: markers };
    })
    .filter((item) => item.instructions.length > 0);
}

/**
 * Get unique category values from the library (for the Category select options).
 */
export function getUniqueCategories(items: DanceLibraryItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const seg of item.instructions ?? []) {
      const m = toInstructionMarker(seg);
      if (m.category) set.add(m.category);
    }
  }
  return Array.from(set).sort();
}

/**
 * Get min/max difficulty from the library (for the Difficulty slider bounds).
 */
export function getDifficultyBounds(
  items: DanceLibraryItem[]
): { min: number; max: number } {
  let min = 0;
  let max = 5;
  for (const item of items) {
    for (const seg of item.instructions ?? []) {
      const m = toInstructionMarker(seg);
      const d = m.difficulty;
      if (d < min) min = d;
      if (d > max) max = d;
    }
  }
  return { min, max };
}
