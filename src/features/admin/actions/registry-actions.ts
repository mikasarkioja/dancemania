"use client";

/**
 * Registry integration: Motion DNA → Move Registry (Gold Standard).
 *
 * This module bridges extracted Motion DNA (dance_library.motion_dna) and the
 * Move Registry. When you "Save to Registry" from the Dictionary Lab, it:
 * 1. Fetches motion_dna for the selected video/segment
 * 2. Computes the mathematical curves (signature) via computeMoveSignature
 * 3. Stores them as the Gold Standard in move_registry.biomechanical_profile
 *
 * Those curves (hip_tilt_curve, foot_velocity_curve, knee_flexion_curve) are
 * then used by the Scanner (label-actions) to compare candidate segments.
 */

import { createClient } from "@/lib/supabase/client";
import { computeMoveSignature } from "@/engines/signature-calculator";
import type { BiomechanicalProfile, PoseData } from "@/types/dance";
import { toast } from "sonner";

export interface SaveToRegistryParams {
  videoId: string;
  /** Start time of segment in seconds. */
  startTimeSec: number;
  /** End time of segment in seconds. */
  endTimeSec: number;
  label: string;
  category: string;
  role?: "Leader" | "Follower" | "Both";
  /** Optional genre (e.g. from dance_library); not stored on move_registry currently. */
  genre?: string;
}

/**
 * Extracts a segment of motion_dna, computes its signature with computeMoveSignature,
 * and inserts a move_registry row with BiomechanicalProfile (curves).
 */
export async function saveMoveToRegistry({
  videoId,
  startTimeSec,
  endTimeSec,
  label,
  category,
  role = "Both",
}: SaveToRegistryParams): Promise<{ success: boolean }> {
  const supabase = createClient();

  const { data: libraryItem, error: fetchError } = await supabase
    .from("dance_library")
    .select("motion_dna")
    .eq("id", videoId)
    .single();

  if (fetchError || !libraryItem?.motion_dna) {
    console.error("Failed to fetch Motion DNA:", fetchError);
    toast.error("The studio vault couldn't find this video's DNA. ✨");
    return { success: false };
  }

  const fullDna = libraryItem.motion_dna as unknown as PoseData;
  const frames = fullDna.frames ?? [];

  const toSec = (ts: number) => (ts >= 1e4 ? ts / 1000 : ts);
  const segmentFrames = frames.filter((f) => {
    const t = toSec(f.timestamp);
    return t >= startTimeSec && t <= endTimeSec;
  });

  if (segmentFrames.length < 10) {
    toast.error(
      "This segment is too short to extract a signature (need at least ~10 frames)."
    );
    return { success: false };
  }

  const signature = computeMoveSignature(segmentFrames, 0);
  const biomechanical_profile: BiomechanicalProfile = {
    hip_tilt_curve: signature.hipTiltCurve,
    foot_velocity_curve: signature.footVelocityCurve,
    knee_flexion_curve: signature.kneeFlexionCurve,
  };

  const { error: insertError } = await supabase.from("move_registry").insert({
    name: label,
    category: category,
    role,
    biomechanical_profile,
    status: "approved",
  });

  if (insertError) {
    console.error("Registry save error:", insertError);
    toast.error("We couldn't add this move to the registry. ✨");
    return { success: false };
  }

  toast.success(`${label} has been added to the Boutique Registry! 💃`);
  return { success: true };
}
