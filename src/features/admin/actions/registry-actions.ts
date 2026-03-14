"use server";

/**
 * Registry integration: Motion DNA → Move Registry (Gold Standard).
 *
 * Save to Registry: fetches motion_dna for the selected video/segment,
 * slices by start/end time, computes signature via computeMoveSignature,
 * validates the 3 critical curves, and upserts move_registry with
 * biomechanical_profile and genre from the source video.
 */

import { createClient } from "@/lib/supabase/server";
import { computeMoveSignature } from "@/engines/signature-calculator";
import type { BiomechanicalProfile, PoseData, PoseFrame } from "@/types/dance";

const MIN_FRAMES_FOR_VALID_MOVE = 10;

export interface SaveToRegistryParams {
  videoId: string;
  /** Start time of segment in seconds. */
  startTime: number;
  /** End time of segment in seconds. */
  endTime: number;
  label: string;
  category: string;
  role?: "Leader" | "Follower" | "Both";
}

export type SaveToRegistryResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Normalize timestamp to seconds (PoseData may use ms or seconds).
 */
function timestampToSec(ts: number): number {
  return ts >= 1e4 ? ts / 1000 : ts;
}

/**
 * Slice motion_dna frames to [startTime, endTime] (in seconds).
 */
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

/**
 * Validate that the computed signature has all 3 curves and they are non-empty.
 */
function validateBiomechanicalProfile(
  profile: BiomechanicalProfile
): { valid: true } | { valid: false; error: string } {
  const hip = profile.hip_tilt_curve;
  const foot = profile.foot_velocity_curve;
  const knee = profile.knee_flexion_curve;

  if (!hip || !Array.isArray(hip) || hip.length === 0) {
    return {
      valid: false,
      error:
        "Hip tilt curve is missing or empty—we need clear pelvic motion to register this move.",
    };
  }
  if (!foot || !Array.isArray(foot) || foot.length === 0) {
    return {
      valid: false,
      error:
        "Foot velocity curve is missing or empty—we need detectable foot movement for the signature.",
    };
  }
  if (!knee || !Array.isArray(knee) || knee.length === 0) {
    return {
      valid: false,
      error:
        "Knee flexion curve is missing or empty—we need leg geometry to complete the biomechanical profile.",
    };
  }
  return { valid: true };
}

/**
 * Server action: fetch motion_dna, slice segment, compute signature,
 * validate curves, and upsert move_registry. Genre is inherited from the source video.
 */
export async function saveMoveToRegistry(
  params: SaveToRegistryParams
): Promise<SaveToRegistryResult> {
  const {
    videoId,
    startTime,
    endTime,
    label,
    category,
    role = "Both",
  } = params;

  const supabase = await createClient();

  const { data: row, error: fetchError } = await supabase
    .from("dance_library")
    .select("motion_dna, genre")
    .eq("id", videoId)
    .single();

  if (fetchError || !row) {
    return {
      success: false,
      error: fetchError?.message ?? "Video not found in the library.",
    };
  }

  const motionDna = row.motion_dna as PoseData | null;
  const frames = motionDna?.frames ?? [];

  if (frames.length === 0) {
    return {
      success: false,
      error:
        "This video has no motion data yet. Run extraction first, then save to registry.",
    };
  }

  const segmentFrames = sliceFrames(frames, startTime, endTime);

  if (segmentFrames.length < MIN_FRAMES_FOR_VALID_MOVE) {
    return {
      success: false,
      error: `This segment is too short to form a valid move (need at least ${MIN_FRAMES_FOR_VALID_MOVE} frames; got ${segmentFrames.length}). Try a longer selection.`,
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
    name: label.trim(),
    category: category.trim() || "General",
    role,
    biomechanical_profile,
    status: "approved",
  };
  if (genre) {
    insertPayload.genre = genre;
  }

  const { error: insertError } = await supabase
    .from("move_registry")
    .insert(insertPayload);

  if (insertError) {
    return {
      success: false,
      error: insertError.message ?? "Could not add this move to the registry.",
    };
  }

  return { success: true };
}

export interface SaveToRegistryFromProfileParams {
  profile: BiomechanicalProfile;
  name: string;
  category: string;
  role: "Leader" | "Follower" | "Both";
  description?: string | null;
  genre?: "salsa" | "bachata" | "other" | null;
}

/**
 * Server action for RegistryForm: persist a pre-computed BiomechanicalProfile
 * (e.g. from Dictionary Lab) as a Gold Standard move. Use when the client
 * already has the profile and only needs to submit metadata.
 */
export async function saveMoveToRegistryFromProfile(
  params: SaveToRegistryFromProfileParams
): Promise<SaveToRegistryResult> {
  const { profile, name, category, role, description = null, genre } = params;

  const validation = validateBiomechanicalProfile(profile);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const supabase = await createClient();
  const insertPayload: Record<string, unknown> = {
    name: name.trim(),
    category: category.trim() || "General",
    role,
    description: description?.trim() || null,
    biomechanical_profile: profile,
    status: "approved",
  };
  if (genre) {
    insertPayload.genre = genre;
  }

  const { error } = await supabase.from("move_registry").insert(insertPayload);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
