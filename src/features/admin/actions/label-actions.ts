"use server";

import { createClient } from "@/lib/supabase/server";
import { computeMoveSignature, compareSignatureToRegistry } from "@/engines/signature-calculator";
import type { PoseFrame } from "@/types/dance";
import type { SuggestedLabel } from "@/types/dance";

const WINDOW_FRAMES = 60; // ~2s at 30fps
const STEP_FRAMES = 15;   // ~0.5s
const MIN_FRAMES = 30;    // ~1s
const SIMILARITY_THRESHOLD = 0.7;

export type RunAutoLabelResult =
  | { ok: true; suggestedLabels: SuggestedLabel[] }
  | { ok: false; error: string };

/**
 * Run auto-label (Scanner) for one video: compare motion_dna to move_registry
 * Gold Standard, write suggested_labels. Call from Admin Move Labeling page.
 */
export async function runAutoLabel(videoId: string): Promise<RunAutoLabelResult> {
  const supabase = await createClient();

  const { data: row, error: rowErr } = await supabase
    .from("dance_library")
    .select("id, motion_dna")
    .eq("id", videoId)
    .single();

  if (rowErr || !row) {
    return { ok: false, error: rowErr?.message ?? "Video not found" };
  }

  const motionDna = row.motion_dna as { frames?: unknown[] } | null;
  const frames = (motionDna?.frames ?? []) as PoseFrame[];
  const leaderFrames = frames.filter((f) => f.partner_id === 0);
  if (leaderFrames.length < MIN_FRAMES) {
    return { ok: false, error: "Not enough motion data (need at least ~1s of leader frames)" };
  }

  const { data: registryRows } = await supabase
    .from("move_registry")
    .select("id, name, biomechanical_profile")
    .eq("status", "approved");

  const registryRefs: { moveId: string; name: string; hipTiltCurve: number[]; footVelocityCurve: number[] }[] = [];
  for (const r of registryRows ?? []) {
    const bp = (r.biomechanical_profile ?? {}) as { hip_tilt_curve?: number[]; foot_velocity_curve?: number[] };
    if (Array.isArray(bp.hip_tilt_curve) && Array.isArray(bp.foot_velocity_curve) && bp.hip_tilt_curve.length && bp.foot_velocity_curve.length) {
      registryRefs.push({
        moveId: r.id,
        name: r.name ?? "Unknown",
        hipTiltCurve: bp.hip_tilt_curve,
        footVelocityCurve: bp.foot_velocity_curve,
      });
    }
  }
  if (registryRefs.length === 0) {
    return { ok: false, error: "No Gold Standard moves in registry (need hip_tilt_curve and foot_velocity_curve in biomechanical_profile)" };
  }

  const results: SuggestedLabel[] = [];
  const seen = new Set<string>();

  for (let start = 0; start <= leaderFrames.length - WINDOW_FRAMES; start += STEP_FRAMES) {
    const end = Math.min(start + WINDOW_FRAMES, leaderFrames.length);
    const segment = leaderFrames.slice(start, end);
    if (segment.length < MIN_FRAMES) continue;
    const startTime = segment[0].timestamp / 1000;
    const endTime = segment[segment.length - 1].timestamp / 1000;
    const key = `${startTime.toFixed(1)}-${endTime.toFixed(1)}`;
    if (seen.has(key)) continue;
    const sig = computeMoveSignature(segment, 0);
    const match = compareSignatureToRegistry(sig, registryRefs);
    if (match && match.score >= SIMILARITY_THRESHOLD) {
      seen.add(key);
      results.push({
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round(endTime * 100) / 100,
        move_id: match.moveId,
        move_name: match.name,
        similarity: Math.round(match.score * 1000) / 1000,
      });
    }
  }

  const { error: updateErr } = await supabase
    .from("dance_library")
    .update({ suggested_labels: results })
    .eq("id", videoId);

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true, suggestedLabels: results };
}

export type ApproveSuggestedLabelResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Approve a suggested label: insert into video_moves and remove from
 * dance_library.suggested_labels. Validates that the move exists in
 * move_registry before committing.
 */
export async function approveSuggestedLabel(
  video_id: string,
  move_id: string,
  start_time: number,
  end_time: number
): Promise<ApproveSuggestedLabelResult> {
  const supabase = await createClient();

  // 1. Validation: ensure the move exists in move_registry
  const { data: move, error: moveErr } = await supabase
    .from("move_registry")
    .select("id")
    .eq("id", move_id)
    .single();

  if (moveErr || !move) {
    return { ok: false, error: "Move not found in registry" };
  }

  // 2. Load current suggested_labels for this video
  const { data: row, error: fetchErr } = await supabase
    .from("dance_library")
    .select("id, suggested_labels")
    .eq("id", video_id)
    .single();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Video not found" };
  }

  const suggestedLabels = Array.isArray(row.suggested_labels) ? row.suggested_labels : [];
  const updatedSuggested = suggestedLabels.filter(
    (s: { move_id?: string; startTime?: number; endTime?: number }) =>
      !(
        s.move_id === move_id &&
        Number(s.startTime) === start_time &&
        Number(s.endTime) === end_time
      )
  );

  // 3. Transaction: insert video_moves + update suggested_labels
  const [{ error: insertErr }, { error: updateErr }] = await Promise.all([
    supabase.from("video_moves").upsert(
      { video_id, move_id },
      { onConflict: "video_id,move_id" }
    ),
    supabase
      .from("dance_library")
      .update({ suggested_labels: updatedSuggested })
      .eq("id", video_id),
  ]);

  if (insertErr) return { ok: false, error: insertErr.message };
  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true };
}

export type RejectSuggestedLabelResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Dismiss a suggestion: remove it from dance_library.suggested_labels only.
 */
export async function rejectSuggestedLabel(
  video_id: string,
  move_id: string,
  start_time: number,
  end_time: number
): Promise<RejectSuggestedLabelResult> {
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("dance_library")
    .select("id, suggested_labels")
    .eq("id", video_id)
    .single();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Video not found" };
  }

  const suggestedLabels = Array.isArray(row.suggested_labels) ? row.suggested_labels : [];
  const updatedSuggested = suggestedLabels.filter(
    (s: { move_id?: string; startTime?: number; endTime?: number }) =>
      !(
        s.move_id === move_id &&
        Number(s.startTime) === start_time &&
        Number(s.endTime) === end_time
      )
  );

  const { error: updateErr } = await supabase
    .from("dance_library")
    .update({ suggested_labels: updatedSuggested })
    .eq("id", video_id);

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true };
}
