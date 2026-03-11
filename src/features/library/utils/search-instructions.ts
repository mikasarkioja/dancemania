/**
 * Client-side search over dance_library results by instructions (move labels / tags).
 * e.g. Search "Pendulo" → only show videos that contain a move labeled "Pendulo".
 */

import type { MoveSegment } from "@/types/dance";

function getSearchableText(seg: MoveSegment): string {
  const pattern = seg.pattern ?? "";
  const instruction = seg.teacherInstruction ?? "";
  const tags = Array.isArray(seg.tags) ? seg.tags.join(" ") : "";
  return `${pattern} ${instruction} ${tags}`.toLowerCase();
}

/**
 * Returns true if the video's instructions contain at least one segment
 * matching the search query (pattern, teacherInstruction, or tags).
 */
export function videoMatchesSearch(
  instructions: MoveSegment[],
  searchQuery: string
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  return instructions.some((seg) => {
    const text = getSearchableText(seg);
    return terms.every((term) => text.includes(term));
  });
}

/**
 * Returns unique move labels (patterns) from instructions for display as tags.
 */
export function getMoveTagsFromInstructions(
  instructions: MoveSegment[]
): string[] {
  const set = new Set<string>();
  for (const seg of instructions) {
    if (seg.pattern) set.add(seg.pattern);
  }
  return Array.from(set).sort();
}
