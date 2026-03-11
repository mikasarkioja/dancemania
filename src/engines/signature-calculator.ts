/**
 * Biomechanical signature from pose sequences: average joint angles,
 * velocity curves, and DTW-based similarity against move_registry.
 */

import type { PoseFrame } from "@/types/dance";
import { LEFT_HIP_KEY, RIGHT_HIP_KEY } from "./mid-hip";

const LEFT_ANKLE_KEY = "left_ankle";
const RIGHT_ANKLE_KEY = "right_ankle";

/** Canonical joint angle keys for consistent vector length. */
const JOINT_ANGLE_KEYS = [
  "left_shoulder_angle",
  "right_shoulder_angle",
  "left_elbow_angle",
  "right_elbow_angle",
  "left_hip_angle",
  "right_hip_angle",
  "left_knee_angle",
  "right_knee_angle",
  "left_ankle_angle",
  "right_ankle_angle",
] as const;

export interface AverageJointAngles {
  [key: string]: number;
}

export interface VelocityCurve {
  key: string;
  values: number[]; // per-frame velocity magnitude
}

export interface MoveSignature {
  averageJointAngles: AverageJointAngles;
  velocityCurves: VelocityCurve[];
  hipTiltCurve: number[];   // per-frame hip tilt (e.g. left_hip.y - right_hip.y or angle)
  footVelocityCurve: number[]; // per-frame combined foot velocity
  frameCount: number;
}

/**
 * Compute average joint angles across a sequence of PoseFrames (for one partner).
 */
export function computeAverageJointAngles(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): AverageJointAngles {
  const filtered = partnerId != null
    ? frames.filter((f) => f.partner_id === partnerId)
    : frames;
  if (filtered.length === 0) return {};
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const f of filtered) {
    const angles = f.metrics?.joint_angles ?? {};
    for (const k of JOINT_ANGLE_KEYS) {
      const v = angles[k as string];
      if (typeof v === "number") {
        sum[k] = (sum[k] ?? 0) + v;
        count[k] = (count[k] ?? 0) + 1;
      }
    }
  }
  const out: AverageJointAngles = {};
  for (const k of Object.keys(sum)) {
    if (count[k]) out[k] = sum[k] / count[k];
  }
  return out;
}

/** Velocity between two consecutive frames for one joint. */
function jointVelocityBetween(prev: PoseFrame, curr: PoseFrame, jointKey: string): number {
  const p = prev.joints[jointKey];
  const c = curr.joints[jointKey];
  if (!p || !c) return 0;
  const dt = (curr.timestamp - prev.timestamp) / 1000 || 0.033;
  return Math.hypot(c.x - p.x, c.y - p.y, (c.z ?? 0) - (p.z ?? 0)) / (dt || 0.001);
}

/**
 * Velocity curves for key joints over the sequence (for one partner).
 */
export function computeVelocityCurves(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): VelocityCurve[] {
  const list = partnerId != null ? frames.filter((f) => f.partner_id === partnerId) : frames;
  if (list.length < 2) return [];
  const jointKeys = [LEFT_HIP_KEY, RIGHT_HIP_KEY, LEFT_ANKLE_KEY, RIGHT_ANKLE_KEY, "left_wrist", "right_wrist"];
  const curves: VelocityCurve[] = [];
  for (const key of jointKeys) {
    const values: number[] = [0];
    for (let i = 1; i < list.length; i++) values.push(jointVelocityBetween(list[i - 1], list[i], key));
    curves.push({ key, values });
  }
  return curves;
}

/**
 * Hip tilt per frame: y-delta between left_hip and right_hip (Pelvic Drop metric).
 */
export function computeHipTiltCurve(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): number[] {
  const list = partnerId != null
    ? frames.filter((f) => f.partner_id === partnerId)
    : frames;
  return list.map((f) => {
    const l = f.joints[LEFT_HIP_KEY];
    const r = f.joints[RIGHT_HIP_KEY];
    if (!l || !r) return 0;
    return l.y - r.y;
  });
}

/**
 * Combined foot (ankle) velocity per frame for 8-count / pasos.
 */
export function computeFootVelocityCurve(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): number[] {
  const list = partnerId != null
    ? frames.filter((f) => f.partner_id === partnerId)
    : frames;
  if (list.length < 2) return list.length === 1 ? [0] : [];
  const out: number[] = [0];
  for (let i = 1; i < list.length; i++) {
    const vl = jointVelocityBetween(list[i - 1], list[i], LEFT_ANKLE_KEY);
    const vr = jointVelocityBetween(list[i - 1], list[i], RIGHT_ANKLE_KEY);
    out.push(Math.max(vl, vr));
  }
  return out;
}

/**
 * Full move signature from a sequence of PoseFrames (one partner).
 */
export function computeMoveSignature(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): MoveSignature {
  const list = partnerId != null
    ? frames.filter((f) => f.partner_id === partnerId)
    : frames;
  return {
    averageJointAngles: computeAverageJointAngles(frames, partnerId),
    velocityCurves: computeVelocityCurves(frames, partnerId),
    hipTiltCurve: computeHipTiltCurve(frames, partnerId),
    footVelocityCurve: computeFootVelocityCurve(frames, partnerId),
    frameCount: list.length,
  };
}

// --- DTW (Dynamic Time Warping) ---

function dtwDistance(seqA: number[], seqB: number[], dist = (a: number, b: number) => Math.abs(a - b)): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return Infinity;
  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = dist(seqA[i - 1], seqB[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[n][m];
}

/**
 * Normalized DTW similarity in [0, 1]: 1 = identical, 0 = maximally different.
 * Uses path length normalization.
 */
export function dtwSimilarity(seqA: number[], seqB: number[]): number {
  if (seqA.length === 0 && seqB.length === 0) return 1;
  if (seqA.length === 0 || seqB.length === 0) return 0;
  const dist = dtwDistance(seqA, seqB);
  const maxLen = Math.max(seqA.length, seqB.length);
  const avgMagnitudeA = seqA.reduce((s, x) => s + Math.abs(x), 0) / seqA.length || 1;
  const avgMagnitudeB = seqB.reduce((s, x) => s + Math.abs(x), 0) / seqB.length || 1;
  const scale = Math.max(avgMagnitudeA, avgMagnitudeB, 0.001);
  const normalizedDist = dist / (maxLen * scale);
  return Math.max(0, 1 - normalizedDist / 10);
}

/**
 * Compare a new move signature to registry entries using DTW on hip-tilt and
 * foot-velocity curves. Returns best match and similarity score.
 */
export function compareSignatureToRegistry(
  newSignature: MoveSignature,
  registrySignatures: { moveId: string; name: string; hipTiltCurve: number[]; footVelocityCurve: number[] }[]
): { moveId: string; name: string; score: number } | null {
  if (registrySignatures.length === 0) return null;
  let best = { moveId: "", name: "", score: 0 };
  for (const reg of registrySignatures) {
    const hipSim = dtwSimilarity(newSignature.hipTiltCurve, reg.hipTiltCurve);
    const footSim = dtwSimilarity(newSignature.footVelocityCurve, reg.footVelocityCurve);
    const score = (hipSim + footSim) / 2;
    if (score > best.score) best = { moveId: reg.moveId, name: reg.name, score };
  }
  return best.score > 0 ? best : null;
}
