import type { PoseData } from "@/types/dance";

/**
 * Compare student PoseData to teacher MotionDNA.
 * Returns similarity score and per-frame/metric feedback.
 * DTW or other alignment logic lives here.
 */
export function compareMotion(
  studentMotion: PoseData,
  teacherMotion: PoseData
): { scoreTotal: number; metrics: Record<string, unknown> } {
  void studentMotion;
  void teacherMotion;
  return { scoreTotal: 0, metrics: {} };
}
