import type { PoseFrame } from "@/types/dance";

/**
 * Beat-sync logic: align student timeline to teacher/reference BPM.
 * Uses rhythm_pulse and timestamps from PoseFrame[].metrics.
 */
export function getBeatSyncMetrics(
  frames: PoseFrame[],
  referenceBpm: number
): Record<string, number> {
  void frames;
  void referenceBpm;
  return {};
}
