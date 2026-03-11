/**
 * Kinetic chain metrics for categorizing moves (Isolation & Body, Footwork, Partner Connection).
 * Used by the candidate-move job to classify outlier movements.
 */

import type { PoseFrame, KineticChainCategory } from "@/types/dance";
import { getMidHip } from "./mid-hip";
import { LEFT_HIP_KEY, RIGHT_HIP_KEY } from "./mid-hip";

const NOSE_KEY = "nose";
const STERNUM_APPROX = "nose"; // or chest center if available
const LEFT_ANKLE_KEY = "left_ankle";
const LEFT_WRIST_KEY = "left_wrist";
const RIGHT_WRIST_KEY = "right_wrist"; // used in leadFollowDistanceCurve

/** A. Ribcage Circle: horizontal displacement of STERNUM relative to MID_HIP. */
export function ribcageCircleMagnitude(frames: PoseFrame[], partnerId?: 0 | 1): number {
  const list = partnerId != null ? frames.filter((f) => f.partner_id === partnerId) : frames;
  if (list.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < list.length; i++) {
    const mid = getMidHip(list[i].joints);
    const sternum = list[i].joints[STERNUM_APPROX];
    if (mid && sternum) {
      const dx = sternum.x - mid.x;
      const dy = sternum.y - mid.y;
      maxDist = Math.max(maxDist, Math.hypot(dx, dy));
    }
  }
  return maxDist;
}

/** A. Pelvic Drop: y-axis delta LEFT_HIP vs RIGHT_HIP (Bachata basic). */
export function pelvicDropCurve(frames: PoseFrame[], partnerId?: 0 | 1): number[] {
  const list = partnerId != null ? frames.filter((f) => f.partner_id === partnerId) : frames;
  return list.map((f) => {
    const l = f.joints[LEFT_HIP_KEY];
    const r = f.joints[RIGHT_HIP_KEY];
    return l && r ? l.y - r.y : 0;
  });
}

/** A. Head Spot: angular velocity of NOSE staying near 0 then rapid turn (simplified: variance of nose position). */
export function headSpotVariance(frames: PoseFrame[], partnerId?: 0 | 1): number {
  const list = partnerId != null ? frames.filter((f) => f.partner_id === partnerId) : frames;
  if (list.length < 2) return 0;
  const noseX = list.map((f) => f.joints[NOSE_KEY]?.x ?? 0);
  const mean = noseX.reduce((a, b) => a + b, 0) / noseX.length;
  const variance = noseX.reduce((s, x) => s + (x - mean) ** 2, 0) / noseX.length;
  return Math.sqrt(variance);
}

/** B. Lateral ankle velocity (Boogaloo-style sliding) while knee flexion present. */
export function lateralAnkleVelocityCurve(frames: PoseFrame[], partnerId?: 0 | 1): number[] {
  const list = partnerId != null ? frames.filter((f) => f.partner_id === partnerId) : frames;
  if (list.length < 2) return [0];
  const out: number[] = [0];
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1].joints[LEFT_ANKLE_KEY];
    const curr = list[i].joints[LEFT_ANKLE_KEY];
    if (prev && curr) {
      const dt = (list[i].timestamp - list[i - 1].timestamp) / 1000 || 0.033;
      out.push(Math.abs(curr.x - prev.x) / (dt || 0.001));
    } else out.push(0);
  }
  return out;
}

/** C. Lead-Follow Delta: distance between Lead RIGHT_WRIST and Follower LEFT_WRIST (needs both partners in frame). */
export function leadFollowDistanceCurve(frames: PoseFrame[]): number[] {
  const lead = frames.find((x) => x.partner_id === 0);
  const follow = frames.find((x) => x.partner_id === 1);
  return frames.map(() => {
    if (!lead || !follow) return 0;
    const lw = lead.joints[RIGHT_WRIST_KEY];
    const fw = follow.joints[LEFT_WRIST_KEY];
    return lw && fw ? Math.hypot(lw.x - fw.x, lw.y - fw.y) : 0;
  });
}

/** C. Compression/Tension: rate of change of distance between two MID_HIP points (lead vs follow). */
export function compressionTensionRate(frames: PoseFrame[]): number[] {
  if (frames.length < 2) return [0];
  const lead = frames.filter((x) => x.partner_id === 0)[0];
  const follow = frames.filter((x) => x.partner_id === 1)[0];
  const dists = frames.map(() => {
    const m0 = lead ? getMidHip(lead.joints) : null;
    const m1 = follow ? getMidHip(follow.joints) : null;
    return m0 && m1 ? Math.hypot(m1.x - m0.x, m1.y - m0.y) : 0;
  });
  const out: number[] = [0];
  for (let i = 1; i < dists.length; i++) {
    const dt = (frames[i].timestamp - frames[i - 1].timestamp) / 1000 || 0.033;
    out.push(Math.abs(dists[i] - dists[i - 1]) / (dt || 0.001));
  }
  return out;
}

/** Classify a segment into a kinetic chain category from dominant metrics. */
export function classifyKineticChain(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): KineticChainCategory {
  const ribcage = ribcageCircleMagnitude(frames, partnerId);
  const headVar = headSpotVariance(frames, partnerId);
  const lateralAnkle = lateralAnkleVelocityCurve(frames, partnerId);
  const avgLateral = lateralAnkle.reduce((a, b) => a + b, 0) / (lateralAnkle.length || 1);
  const hasPartner = frames.some((f) => f.partner_id === 0) && frames.some((f) => f.partner_id === 1);
  const compTens = hasPartner ? compressionTensionRate(frames) : [];
  const avgComp = compTens.length ? compTens.reduce((a, b) => a + b, 0) / compTens.length : 0;

  if (hasPartner && avgComp > 0.1) return "partner_connection";
  if (avgLateral > ribcage && avgLateral > headVar * 2) return "footwork";
  return "isolation_body";
}
