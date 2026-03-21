"use server";

import { createClient } from "@/lib/supabase/server";

export type VideoUsageActionType =
  | "view"
  | "practice_start"
  | "practice_complete";

/**
 * Sentinel: inserts analytics row as the authenticated user only.
 * Skips silently when not logged in or when the video is not visible under RLS.
 */
export async function logVideoActivity(
  videoId: string,
  actionType: VideoUsageActionType
): Promise<{ ok: boolean }> {
  if (!videoId || !actionType) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: video, error: vErr } = await supabase
    .from("dance_library")
    .select("id")
    .eq("id", videoId)
    .maybeSingle();

  if (vErr || !video) return { ok: false };

  const { error } = await supabase.from("video_usage_logs").insert({
    video_id: videoId,
    user_id: user.id,
    action_type: actionType,
  });

  if (error) {
    console.warn("[logVideoActivity]", error.message);
    return { ok: false };
  }
  return { ok: true };
}
