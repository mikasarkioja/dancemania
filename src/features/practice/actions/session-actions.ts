"use server";

import { createClient } from "@/lib/supabase/server";

export type ComparisonJointGroup = "Hips" | "Feet" | "Frame";

export interface SessionCoachingFeedback {
  proTips: string[];
  worstJointGroup?: ComparisonJointGroup | null;
  harmonyScore?: number | null;
}

/**
 * Fetch coaching feedback for a past session (for replay/detail views).
 * Guardian: only returns data when session belongs to auth.uid(); RLS enforces.
 */
export async function getSessionCoachingFeedback(
  sessionId: string
): Promise<SessionCoachingFeedback | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("practice_sessions")
    .select("metrics, score_total")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) return null;

  const metrics = (row.metrics as Record<string, unknown>) ?? {};
  const coaching = metrics.coaching_feedback as
    | { proTips?: string[]; focusAreas?: unknown; generatedAt?: string }
    | undefined;
  const worstJointGroup = metrics.worstJointGroup as
    | ComparisonJointGroup
    | undefined
    | null;
  const harmonyScore =
    (metrics.harmonyScore as number | undefined) ??
    (row.score_total != null ? Number(row.score_total) : undefined);

  return {
    proTips:
      Array.isArray(coaching?.proTips) && coaching.proTips.length > 0
        ? coaching.proTips
        : [],
    worstJointGroup: worstJointGroup ?? null,
    harmonyScore: harmonyScore ?? null,
  };
}
