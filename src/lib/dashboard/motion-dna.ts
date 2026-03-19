/**
 * Motion DNA: aggregate radar values (Hips, Feet, Posture, Timing, Flow) from session metrics.
 * Session metrics have harmonyScore and worstJointGroup; we derive per-axis scores.
 */

export type MotionDnaAxis = "Hips" | "Feet" | "Posture" | "Timing" | "Flow";
export type ComparisonJointGroup = "Hips" | "Feet" | "Frame";

export interface MotionDnaRadarPoint {
  axis: MotionDnaAxis;
  value: number;
  fullMark: number;
}

const WORST_PENALTY = 18;
const AXES: MotionDnaAxis[] = ["Hips", "Feet", "Posture", "Timing", "Flow"];

/** Map stored Frame to display "Posture". */
function mapWorstToAxis(
  worst: ComparisonJointGroup | null | undefined
): MotionDnaAxis | null {
  if (!worst) return null;
  if (worst === "Frame") return "Posture";
  return worst;
}

export interface SessionMetric {
  harmonyScore: number;
  worstJointGroup?: ComparisonJointGroup | null;
  timingOffsetMs?: number | null;
}

/**
 * Build radar data (0–100 per axis) from recent session metrics.
 * Axis score = average of (harmony - penalty when that axis was worst). Timing/Flow use harmony.
 */
export function buildMotionDnaRadarData(
  sessions: SessionMetric[]
): MotionDnaRadarPoint[] {
  if (sessions.length === 0) {
    return AXES.map((axis) => ({ axis, value: 50, fullMark: 100 }));
  }

  const sumByAxis: Record<MotionDnaAxis, number> = {
    Hips: 0,
    Feet: 0,
    Posture: 0,
    Timing: 0,
    Flow: 0,
  };
  const countByAxis: Record<MotionDnaAxis, number> = {
    Hips: 0,
    Feet: 0,
    Posture: 0,
    Timing: 0,
    Flow: 0,
  };

  for (const s of sessions) {
    const harmony = Math.max(0, Math.min(100, s.harmonyScore));
    const worstAxis = mapWorstToAxis(s.worstJointGroup);

    for (const axis of AXES) {
      const penalty = worstAxis === axis ? WORST_PENALTY : 0;
      const value = Math.max(0, harmony - penalty);
      sumByAxis[axis] += value;
      countByAxis[axis] += 1;
    }
  }

  return AXES.map((axis) => ({
    axis,
    value: Math.round(
      countByAxis[axis] > 0 ? sumByAxis[axis] / countByAxis[axis] : 50
    ),
    fullMark: 100,
  }));
}
