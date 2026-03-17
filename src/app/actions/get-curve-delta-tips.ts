"use server";

/**
 * Supply-to-Practice bridge: compare student practice curves to the Gold Standard
 * in move_registry and return human-readable delta tips for the CoachingCard.
 * Guardian: only reads registry moves linked to the given video (video_moves);
 * video must exist (published or draft) so we only expose curves for valid content.
 */

import { createClient } from "@/lib/supabase/server";
import {
  computeMoveSignature,
  dtwSimilarity,
} from "@/engines/signature-calculator";
import type { PoseFrame, BiomechanicalProfile } from "@/types/dance";

export interface CurveDeltaTip {
  message: string;
  severity?: "low" | "medium" | "high";
}

export interface CurveDeltaResult {
  tips: CurveDeltaTip[];
  moveName?: string;
  hipMatchPct?: number;
  footMatchPct?: number;
}

/**
 * Fetch Gold Standard profile for a video (first linked move), compute student
 * signature from frames, compare curves via DTW, return delta tips.
 * Scoped to videoId — no auth.uid() on move_registry; we only use moves
 * linked via video_moves for this video.
 */
export async function getCurveDeltaTips(
  videoId: string,
  studentFrames: PoseFrame[]
): Promise<CurveDeltaResult> {
  const tips: CurveDeltaTip[] = [];
  const supabase = await createClient();

  // Guardian: ensure video exists (optional: restrict to published for test users)
  const { data: video, error: videoErr } = await supabase
    .from("dance_library")
    .select("id")
    .eq("id", videoId)
    .single();

  if (videoErr || !video) {
    return { tips };
  }

  // Get move_ids linked to this video (video_moves)
  const { data: videoMoves } = await supabase
    .from("video_moves")
    .select("move_id")
    .eq("video_id", videoId)
    .limit(1);

  const moveId =
    videoMoves && videoMoves.length > 0 ? videoMoves[0].move_id : null;
  if (!moveId) {
    return { tips };
  }

  // Fetch Gold Standard biomechanical_profile for this move
  const { data: moveRow, error: moveErr } = await supabase
    .from("move_registry")
    .select("id, name, biomechanical_profile")
    .eq("id", moveId)
    .single();

  if (moveErr || !moveRow?.biomechanical_profile) {
    return { tips };
  }

  const gold = moveRow.biomechanical_profile as BiomechanicalProfile;
  const hipCurve = gold.hip_tilt_curve;
  const footCurve = gold.foot_velocity_curve;

  if (
    (!hipCurve || hipCurve.length === 0) &&
    (!footCurve || footCurve.length === 0)
  ) {
    return { tips, moveName: moveRow.name ?? undefined };
  }

  // Compute student signature from frames (leader only)
  const studentSignature = computeMoveSignature(studentFrames, 0);

  let hipMatchPct: number | undefined;
  let footMatchPct: number | undefined;

  if (
    hipCurve &&
    hipCurve.length > 0 &&
    studentSignature.hipTiltCurve.length > 0
  ) {
    const sim = dtwSimilarity(studentSignature.hipTiltCurve, hipCurve);
    hipMatchPct = Math.round(sim * 100);
    if (hipMatchPct < 70) {
      tips.push({
        message: `Your hip movement is ${100 - hipMatchPct}% away from the Gold Standard "${moveRow.name ?? "this move"}". Focus on matching the pelvic motion and timing.`,
        severity: hipMatchPct < 50 ? "high" : "medium",
      });
    } else if (hipMatchPct >= 85) {
      tips.push({
        message: `Your hip tilt curve is very close to the Gold Standard—great alignment with "${moveRow.name ?? "this move"}".`,
        severity: "low",
      });
    }
  }

  if (
    footCurve &&
    footCurve.length > 0 &&
    studentSignature.footVelocityCurve.length > 0
  ) {
    const sim = dtwSimilarity(studentSignature.footVelocityCurve, footCurve);
    footMatchPct = Math.round(sim * 100);
    if (footMatchPct < 70) {
      tips.push({
        message: `Your foot velocity pattern is ${100 - footMatchPct}% off the Gold Standard. Work on step timing and weight transfer to match the reference.`,
        severity: footMatchPct < 50 ? "high" : "medium",
      });
    } else if (footMatchPct >= 85) {
      tips.push({
        message: `Your foot velocity matches the Gold Standard well—strong footwork for "${moveRow.name ?? "this move"}".`,
        severity: "low",
      });
    }
  }

  return {
    tips,
    moveName: moveRow.name ?? undefined,
    hipMatchPct,
    footMatchPct,
  };
}
