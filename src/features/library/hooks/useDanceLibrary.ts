"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DanceGenre, MoveRole } from "@/types/dance";
import type { MoveSegment } from "@/types/dance";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

/** One published video from dance_library for student discovery. */
export interface PublishedVideo {
  id: string;
  slug: string | null;
  title: string;
  genre: DanceGenre;
  difficulty: DifficultyLevel;
  video_url: string;
  instructions: MoveSegment[];
  bpm: number | null;
}

export interface UseDanceLibraryFilters {
  genre?: DanceGenre | null;
  /** Single difficulty or multiple (client-side OR). */
  difficulty?: DifficultyLevel | DifficultyLevel[] | null;
  /** Filter to videos that have at least one segment for this role (client-side). */
  role?: MoveRole | null;
}

export interface UseDanceLibraryResult {
  data: PublishedVideo[];
  error: Error | null;
  isLoading: boolean;
}

/**
 * Fetches published videos from dance_library with optional server-side filters
 * (genre, difficulty). Role filter is applied client-side from instructions.
 */
export function useDanceLibrary(
  filters: UseDanceLibraryFilters = {}
): UseDanceLibraryResult {
  const [data, setData] = useState<PublishedVideo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { genre, difficulty, role } = filters;
  const genreKey = genre ?? "";
  const difficultyKey = Array.isArray(difficulty)
    ? difficulty.join(",")
    : (difficulty ?? "");
  const roleKey = role ?? "";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const run = async () => {
      setError(null);
      setIsLoading(true);
      try {
        let query = supabase
          .from("dance_library")
          .select(
            "id, slug, title, genre, difficulty, video_url, instructions, bpm"
          )
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (genre) query = query.eq("genre", genre);
        const difficultyArr = Array.isArray(difficulty)
          ? difficulty
          : difficulty
            ? [difficulty]
            : [];
        if (difficultyArr.length === 1)
          query = query.eq("difficulty", difficultyArr[0]);

        const { data: rows, error: err } = await query;

        if (cancelled) return;
        if (err) {
          setError(err as unknown as Error);
          setData([]);
          return;
        }

        let items: PublishedVideo[] = (rows ?? []).map((row) => ({
          id: row.id,
          slug: row.slug ?? null,
          title: row.title ?? "",
          genre: (row.genre ?? "other") as DanceGenre,
          difficulty: (row.difficulty ?? "beginner") as DifficultyLevel,
          video_url: row.video_url ?? "",
          instructions: Array.isArray(row.instructions) ? row.instructions : [],
          bpm: row.bpm ?? null,
        }));

        if (role && role !== "Both") {
          items = items.filter((item) =>
            item.instructions.some(
              (seg) => seg.role === role || seg.role === "Both"
            )
          );
        }
        if (difficultyArr.length > 1) {
          items = items.filter((item) =>
            difficultyArr.includes(item.difficulty)
          );
        }

        setData(items);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // Stable keys to avoid array reference churn for difficulty[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreKey, difficultyKey, roleKey]);

  return { data, error, isLoading };
}
