"use server";

/**
 * MAL: Promote an AI proposal to the move_registry (verified Gold Standard).
 * When an admin swipes "Right," we extract the segment from motion_dna,
 * compute the signature, insert into move_registry with status approved,
 * and mark the proposal as approved in dance_library.ai_proposals.
 */

import { createClient } from "@/lib/supabase/server";
import { computeMoveSignature } from "@/engines/signature-calculator";
import type { BiomechanicalProfile, PoseData, PoseFrame } from "@/types/dance";
import type { SalsaAgentMetadata } from "@/types/mal";

const MIN_FRAMES_FOR_VALID_MOVE = 10;

function timestampToSec(ts: number): number {
  return ts >= 1e4 ? ts / 1000 : ts;
}

function sliceFrames(
  frames: PoseFrame[],
  startTime: number,
  endTime: number
): PoseFrame[] {
  return frames.filter((f) => {
    const t = timestampToSec(f.timestamp);
    return t >= startTime && t <= endTime;
  });
}

function validateBiomechanicalProfile(
  profile: BiomechanicalProfile
): { valid: true } | { valid: false; error: string } {
  const hip = profile.hip_tilt_curve;
  const foot = profile.foot_velocity_curve;
  const knee = profile.knee_flexion_curve;
  if (!hip || !Array.isArray(hip) || hip.length === 0) {
    return { valid: false, error: "Hip tilt curve is missing or empty." };
  }
  if (!foot || !Array.isArray(foot) || foot.length === 0) {
    return { valid: false, error: "Foot velocity curve is missing or empty." };
  }
  if (!knee || !Array.isArray(knee) || knee.length === 0) {
    return { valid: false, error: "Knee flexion curve is missing or empty." };
  }
  return { valid: true };
}

export type PromoteProposalResult =
  | { success: true; moveId: string }
  | { success: false; error: string };

/**
 * Promote an AI proposal to the registry: extract segment from motion_dna,
 * compute signature, insert move_registry (verified), update proposal status to approved.
 */
export async function promoteProposalToRegistry(
  videoId: string,
  proposal: SalsaAgentMetadata
): Promise<PromoteProposalResult> {
  if (proposal.status !== "pending") {
    return { success: false, error: "Proposal is not pending." };
  }
  const segment = proposal.segments[0];
  if (!segment) {
    return { success: false, error: "Proposal has no segment." };
  }
  const moveName =
    proposal.label_suggestions[0]?.move_name?.trim() ?? "Unnamed move";

  const supabase = await createClient();

  const { data: row, error: fetchError } = await supabase
    .from("dance_library")
    .select("motion_dna, genre, ai_proposals")
    .eq("id", videoId)
    .single();

  if (fetchError || !row) {
    return { success: false, error: fetchError?.message ?? "Video not found." };
  }

  const motionDna = row.motion_dna as PoseData | null;
  const frames = motionDna?.frames ?? [];
  if (frames.length === 0) {
    return {
      success: false,
      error: "No motion data. Run extraction first.",
    };
  }

  const segmentFrames = sliceFrames(frames, segment.startTime, segment.endTime);
  if (segmentFrames.length < MIN_FRAMES_FOR_VALID_MOVE) {
    return {
      success: false,
      error: `Segment too short (need ${MIN_FRAMES_FOR_VALID_MOVE}+ frames; got ${segmentFrames.length}).`,
    };
  }

  const signature = computeMoveSignature(segmentFrames, 0);
  const biomechanical_profile: BiomechanicalProfile = {
    hip_tilt_curve: signature.hipTiltCurve,
    foot_velocity_curve: signature.footVelocityCurve,
    knee_flexion_curve: signature.kneeFlexionCurve,
  };
  const validation = validateBiomechanicalProfile(biomechanical_profile);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const genre =
    row.genre === "salsa" || row.genre === "bachata" || row.genre === "other"
      ? row.genre
      : null;

  const insertPayload: Record<string, unknown> = {
    name: moveName,
    category: "General",
    role: "Both",
    biomechanical_profile,
    status: "approved",
  };
  if (genre) insertPayload.genre = genre;

  const { data: inserted, error: insertError } = await supabase
    .from("move_registry")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to add move to registry.",
    };
  }

  const aiProposals = Array.isArray(row.ai_proposals) ? row.ai_proposals : [];
  const updatedProposals = aiProposals.map((p: SalsaAgentMetadata) =>
    p.proposal_id === proposal.proposal_id
      ? { ...p, status: "approved" as const }
      : p
  );

  const [{ error: updateError }, { error: linkError }] = await Promise.all([
    supabase
      .from("dance_library")
      .update({ ai_proposals: updatedProposals })
      .eq("id", videoId),
    supabase
      .from("video_moves")
      .upsert(
        { video_id: videoId, move_id: inserted.id },
        { onConflict: "video_id,move_id" }
      ),
  ]);

  if (updateError) {
    return {
      success: false,
      error: updateError.message ?? "Failed to update proposal status.",
    };
  }
  if (linkError) {
    return {
      success: false,
      error: linkError.message ?? "Failed to link video to move.",
    };
  }

  return { success: true, moveId: inserted.id };
}
