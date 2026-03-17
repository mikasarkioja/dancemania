"use server";

/**
 * Suggest a "First Move" for the user based on assessment persona.
 * Guardian: read-only; move_registry is public SELECT. No user data written.
 */

import { createClient } from "@/lib/supabase/server";

export type AssessmentPersona = "Seedling" | "Blossom" | "Performer";

export interface FirstMoveSuggestion {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

/**
 * Fetch one move from move_registry suitable for the assessment level.
 * Seedling: prefer category "Basic" or first approved; Blossom/Performer: any approved.
 */
export async function getFirstMoveForLevel(
  level: AssessmentPersona,
  genre?: string
): Promise<FirstMoveSuggestion | null> {
  const supabase = await createClient();
  const genreLower = genre?.toLowerCase() === "bachata" ? "bachata" : "salsa";

  const { data: moves } = await supabase
    .from("move_registry")
    .select("id, name, category, description")
    .eq("status", "approved")
    .or(`genre.eq.${genreLower},genre.is.null`)
    .limit(20);

  if (!moves || moves.length === 0) return null;

  if (level === "Seedling") {
    const basic = moves.find(
      (m) =>
        m.category?.toLowerCase().includes("basic") ||
        m.category?.toLowerCase().includes("fundamental")
    );
    const pick = basic ?? moves[0];
    return {
      id: pick.id,
      name: pick.name ?? "",
      category: pick.category ?? "",
      description: pick.description ?? null,
    };
  }

  const pick = moves[Math.floor(Math.random() * Math.min(moves.length, 5))];
  return {
    id: pick.id,
    name: pick.name ?? "",
    category: pick.category ?? "",
    description: pick.description ?? null,
  };
}
