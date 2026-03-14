"use server";

import { createClient } from "@/lib/supabase/server";
import {
  computeMoveSignature,
  compareSignatureToRegistry,
} from "@/engines/signature-calculator";
import type {
  PoseFrame,
  SuggestedLabel,
  BiomechanicalProfile,
} from "@/types/dance";

const WINDOW_FRAMES = 60; // ~2s at 30fps
const STEP_FRAMES = 15; // ~0.5s
const MIN_FRAMES = 30; // ~1s
const SIMILARITY_THRESHOLD = 0.55; // lowered so more segments can match; registry curves must be populated

export type RunAutoLabelResult =
  | { ok: true; suggestedLabels: SuggestedLabel[]; message?: string }
  | { ok: false; error: string };

/**
 * Run auto-label (Scanner) for one video: compare motion_dna to move_registry
 * Gold Standard, write suggested_labels. Call from Admin Move Labeling page.
 */
export async function runAutoLabel(
  videoId: string
): Promise<RunAutoLabelResult> {
  const supabase = await createClient();

  const { data: row, error: rowErr } = await supabase
    .from("dance_library")
    .select("id, motion_dna, genre")
    .eq("id", videoId)
    .single();

  if (rowErr || !row) {
    return { ok: false, error: rowErr?.message ?? "Video not found" };
  }

  const videoGenre =
    row.genre === "salsa" || row.genre === "bachata" ? row.genre : "salsa";

  const motionDna = row.motion_dna as { frames?: unknown[] } | null;
  const rawFrames = (motionDna?.frames ?? []) as PoseFrame[];
  const frames = rawFrames.map((f) => {
    const ts = f.timestamp;
    const tsMs = ts > 0 && ts < 1e4 ? ts * 1000 : ts;
    return {
      ...f,
      timestamp: typeof tsMs === "number" && !Number.isNaN(tsMs) ? tsMs : 0,
      partner_id: f.partner_id ?? 0,
    } as PoseFrame;
  });
  const leaderFrames = frames.filter((f) => f.partner_id === 0);
  if (leaderFrames.length < MIN_FRAMES) {
    return {
      ok: false,
      error: "Not enough motion data (need at least ~1s of leader frames)",
    };
  }

  const { data: registryRows } = await supabase
    .from("move_registry")
    .select("id, name, biomechanical_profile")
    .eq("status", "approved")
    .or(`genre.eq.${videoGenre},genre.is.null`);

  const registryRefs: {
    moveId: string;
    name: string;
    hipTiltCurve: number[];
    footVelocityCurve: number[];
  }[] = [];
  for (const r of registryRows ?? []) {
    const bp = (r.biomechanical_profile ?? {}) as BiomechanicalProfile;
    if (
      Array.isArray(bp.hip_tilt_curve) &&
      Array.isArray(bp.foot_velocity_curve) &&
      bp.hip_tilt_curve.length &&
      bp.foot_velocity_curve.length
    ) {
      registryRefs.push({
        moveId: r.id,
        name: r.name ?? "Unknown",
        hipTiltCurve: bp.hip_tilt_curve,
        footVelocityCurve: bp.foot_velocity_curve,
      });
    }
  }
  if (registryRefs.length === 0) {
    return {
      ok: false,
      error:
        "No Gold Standard moves in registry. Add move_registry rows with biomechanical_profile containing hip_tilt_curve and foot_velocity_curve (arrays). Run the CoMPAS/map script or Python suggest_labels pipeline to populate them.",
    };
  }

  const results: SuggestedLabel[] = [];
  const seen = new Set<string>();

  for (
    let start = 0;
    start <= leaderFrames.length - WINDOW_FRAMES;
    start += STEP_FRAMES
  ) {
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
  const message =
    results.length === 0
      ? "No segments matched the registry (similarity threshold 0.55). Ensure move_registry has approved moves with hip_tilt_curve and foot_velocity_curve in biomechanical_profile."
      : undefined;
  return { ok: true, suggestedLabels: results, message };
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

  const suggestedLabels = Array.isArray(row.suggested_labels)
    ? row.suggested_labels
    : [];
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
    supabase
      .from("video_moves")
      .upsert({ video_id, move_id }, { onConflict: "video_id,move_id" }),
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

  const suggestedLabels = Array.isArray(row.suggested_labels)
    ? row.suggested_labels
    : [];
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
