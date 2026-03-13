/**
 * Biomechanical signature from pose sequences: average joint angles,
 * velocity curves, and DTW-based similarity against move_registry.
 * Geometry helpers and generateMoveSignature produce a BiomechanicalProfile
 * (Math Second: pure, testable utilities for the Lab/Dictionary).
 */

import type {
  PoseFrame,
  BiomechanicalProfile,
  Joint3D,
} from "@/types/dance";
import { getMidHip, LEFT_HIP_KEY, RIGHT_HIP_KEY } from "./mid-hip";

const LEFT_ANKLE_KEY = "left_ankle";
const RIGHT_ANKLE_KEY = "right_ankle";
const LEFT_KNEE_KEY = "left_knee";
const RIGHT_KNEE_KEY = "right_knee";
const LEFT_SHOULDER_KEY = "left_shoulder";
const RIGHT_SHOULDER_KEY = "right_shoulder";
const LEFT_ELBOW_KEY = "left_elbow";
const RIGHT_ELBOW_KEY = "right_elbow";
const LEFT_WRIST_KEY = "left_wrist";
const RIGHT_WRIST_KEY = "right_wrist";

/** 3D point for geometry (joint position). */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

const RAD_TO_DEG = 180 / Math.PI;

// --- Geometry (pure, testable) ---

/**
 * Angle at b between segments ba and bc (Shoulder-Elbow-Wrist style).
 * Returns angle in degrees [0, 180].
 */
export function calculateJointAngle(
  a: Point3D,
  b: Point3D,
  c: Point3D
): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const baz = (a.z ?? 0) - (b.z ?? 0);
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const bcz = (c.z ?? 0) - (b.z ?? 0);
  const dot = bax * bcx + bay * bcy + baz * bcz;
  const lenBa = Math.hypot(bax, bay, baz) || 1e-10;
  const lenBc = Math.hypot(bcx, bcy, bcz) || 1e-10;
  const cosAngle = Math.max(-1, Math.min(1, dot / (lenBa * lenBc)));
  return Math.acos(cosAngle) * RAD_TO_DEG;
}

/**
 * Pelvic tilt from left and right hip: vertical delta (y) and angle of hip line from horizontal.
 * verticalDelta = left.y - right.y (positive = left hip lower); angle in degrees.
 */
export function calculatePelvicTilt(
  leftHip: Point3D,
  rightHip: Point3D
): { verticalDelta: number; angleDeg: number } {
  const dx = rightHip.x - leftHip.x;
  const dy = rightHip.y - leftHip.y;
  const verticalDelta = leftHip.y - rightHip.y;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = angleRad * RAD_TO_DEG;
  return { verticalDelta, angleDeg };
}

/**
 * Peak and average speed of a joint over a segment.
 * jointPositions: array of {x,y,z} in order; timestampsMs: corresponding times in milliseconds.
 * Returns speeds in same units as input per second (e.g. units/sec if positions are in normalized coords).
 */
export function calculateVelocity(
  jointPositions: Point3D[],
  timestampsMs: number[]
): { peak: number; average: number } {
  if (jointPositions.length < 2 || timestampsMs.length < 2) {
    return { peak: 0, average: 0 };
  }
  const n = Math.min(jointPositions.length, timestampsMs.length);
  const speeds: number[] = [];
  for (let i = 1; i < n; i++) {
    const dtSec = (timestampsMs[i] - timestampsMs[i - 1]) / 1000 || 0.001;
    const dx = jointPositions[i].x - jointPositions[i - 1].x;
    const dy = jointPositions[i].y - jointPositions[i - 1].y;
    const dz = (jointPositions[i].z ?? 0) - (jointPositions[i - 1].z ?? 0);
    speeds.push(Math.hypot(dx, dy, dz) / dtSec);
  }
  if (speeds.length === 0) return { peak: 0, average: 0 };
  const peak = Math.max(...speeds);
  const average = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  return { peak, average };
}

/** Mid-shoulder point from joints (average of left and right shoulder). */
function getMidShoulder(joints: Record<string, Joint3D>): Point3D | null {
  const l = joints[LEFT_SHOULDER_KEY];
  const r = joints[RIGHT_SHOULDER_KEY];
  if (!l || !r) return null;
  return {
    x: (l.x + r.x) / 2,
    y: (l.y + r.y) / 2,
    z: ((l.z ?? 0) + (r.z ?? 0)) / 2,
  };
}

/** Torso height: distance between mid-shoulder and mid-hip (for normalization). */
export function getTorsoHeight(joints: Record<string, Joint3D>): number {
  const midShoulder = getMidShoulder(joints);
  const midHip = getMidHip(joints);
  if (!midShoulder || !midHip) return 1;
  const dx = midShoulder.x - midHip.x;
  const dy = midShoulder.y - midHip.y;
  const dz = (midShoulder.z ?? 0) - 0; // mid_hip is 2D (x,y) from getMidHip
  const h = Math.hypot(dx, dy, dz);
  return h > 0 ? h : 1;
}

/** Joint3D to Point3D. */
function toPoint3D(j: Joint3D): Point3D {
  return { x: j.x, y: j.y, z: j.z ?? 0 };
}

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
  hipTiltCurve: number[]; // per-frame hip tilt (e.g. left_hip.y - right_hip.y or angle)
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
  const filtered =
    partnerId != null
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
function jointVelocityBetween(
  prev: PoseFrame,
  curr: PoseFrame,
  jointKey: string
): number {
  const p = prev.joints[jointKey];
  const c = curr.joints[jointKey];
  if (!p || !c) return 0;
  const dt = (curr.timestamp - prev.timestamp) / 1000 || 0.033;
  return (
    Math.hypot(c.x - p.x, c.y - p.y, (c.z ?? 0) - (p.z ?? 0)) / (dt || 0.001)
  );
}

/**
 * Velocity curves for key joints over the sequence (for one partner).
 */
export function computeVelocityCurves(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): VelocityCurve[] {
  const list =
    partnerId != null
      ? frames.filter((f) => f.partner_id === partnerId)
      : frames;
  if (list.length < 2) return [];
  const jointKeys = [
    LEFT_HIP_KEY,
    RIGHT_HIP_KEY,
    LEFT_ANKLE_KEY,
    RIGHT_ANKLE_KEY,
    "left_wrist",
    "right_wrist",
  ];
  const curves: VelocityCurve[] = [];
  for (const key of jointKeys) {
    const values: number[] = [0];
    for (let i = 1; i < list.length; i++)
      values.push(jointVelocityBetween(list[i - 1], list[i], key));
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
  const list =
    partnerId != null
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
  const list =
    partnerId != null
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
 * Knee flexion (hip-knee-ankle angle) per frame in degrees; weighted leg = average of left and right.
 */
export function computeKneeFlexionCurve(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): number[] {
  const list =
    partnerId != null
      ? frames.filter((f) => f.partner_id === partnerId)
      : frames;
  return list.map((f) => {
    const angles = f.metrics?.joint_angles ?? {};
    const leftKnee = angles["left_knee_angle"];
    const rightKnee = angles["right_knee_angle"];
    if (typeof leftKnee === "number" && typeof rightKnee === "number") {
      return (leftKnee + rightKnee) / 2;
    }
    const lh = f.joints[LEFT_HIP_KEY];
    const lk = f.joints[LEFT_KNEE_KEY];
    const la = f.joints[LEFT_ANKLE_KEY];
    const rh = f.joints[RIGHT_HIP_KEY];
    const rk = f.joints[RIGHT_KNEE_KEY];
    const ra = f.joints[RIGHT_ANKLE_KEY];
    const values: number[] = [];
    if (lh && lk && la)
      values.push(
        calculateJointAngle(toPoint3D(lh), toPoint3D(lk), toPoint3D(la))
      );
    if (rh && rk && ra)
      values.push(
        calculateJointAngle(toPoint3D(rh), toPoint3D(rk), toPoint3D(ra))
      );
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  });
}

/**
 * Full move signature from a sequence of PoseFrames (one partner).
 */
export function computeMoveSignature(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): MoveSignature {
  const list =
    partnerId != null
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

// --- BiomechanicalProfile from PoseFrame[] (normalized, testable) ---

export interface GenerateMoveSignatureOptions {
  /** Start time of the move in seconds (inclusive). */
  startTimeSec?: number;
  /** End time of the move in seconds (inclusive). */
  endTimeSec?: number;
  /** Filter to one partner. */
  partnerId?: 0 | 1;
}

export interface GenerateMoveSignatureResult {
  profile: BiomechanicalProfile;
  /** Timestamps (seconds) of detected rhythmic pulse (local minima of mid_hip vertical velocity). */
  rhythmicPulseTimes: number[];
  /** Average torso height over the segment (used for normalization). */
  torsoHeightAvg: number;
}

/**
 * Vertical velocity of mid_hip (y only) per frame; first frame is 0.
 */
function midHipVerticalVelocityCurve(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): number[] {
  const list =
    partnerId != null
      ? frames.filter((f) => f.partner_id === partnerId)
      : frames;
  if (list.length < 2) return list.length === 1 ? [0] : [];
  const out: number[] = [0];
  for (let i = 1; i < list.length; i++) {
    const prev = getMidHip(list[i - 1].joints);
    const curr = getMidHip(list[i].joints);
    const dtSec = (list[i].timestamp - list[i - 1].timestamp) / 1000 || 0.001;
    if (prev && curr) out.push((curr.y - prev.y) / dtSec);
    else out.push(0);
  }
  return out;
}

/**
 * Indices where value is a local minimum (strictly less than both neighbors).
 */
function localMinimaIndices(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < values[i - 1] && values[i] < values[i + 1]) out.push(i);
  }
  return out;
}

/**
 * Transform a sequence of PoseFrame data into a BiomechanicalProfile.
 * - Filters frames for the move duration (startTimeSec, endTimeSec) and optional partnerId.
 * - Calculates average and max for knee_flexion, hip_tilt, arm_extension (angles in degrees).
 * - Detects Rhythmic Pulse as local minima of mid_hip vertical velocity (bounce/tap).
 * - All angles in degrees; spatial measurements normalized by torso_height (mid-shoulder to mid-hip).
 */
export function generateMoveSignature(
  frames: PoseFrame[],
  options: GenerateMoveSignatureOptions = {}
): GenerateMoveSignatureResult {
  const { startTimeSec, endTimeSec, partnerId } = options;
  let list =
    partnerId != null
      ? frames.filter((f) => f.partner_id === partnerId)
      : frames;

  if (startTimeSec != null || endTimeSec != null) {
    const tMin = startTimeSec ?? 0;
    const tMax = endTimeSec ?? Infinity;
    list = list.filter((f) => {
      const t = f.timestamp / 1000;
      return t >= tMin && t <= tMax;
    });
  }

  if (list.length === 0) {
    return {
      profile: {},
      rhythmicPulseTimes: [],
      torsoHeightAvg: 1,
    };
  }

  const torsoHeights = list.map((f) => getTorsoHeight(f.joints));
  const torsoHeightAvg =
    torsoHeights.reduce((a, b) => a + b, 0) / torsoHeights.length || 1;

  // Knee flexion: from metrics or compute (hip-knee-ankle angle)
  const kneeFlexions: number[] = [];
  for (const f of list) {
    const angles = f.metrics?.joint_angles ?? {};
    const leftKnee = angles["left_knee_angle"];
    const rightKnee = angles["right_knee_angle"];
    if (typeof leftKnee === "number" && typeof rightKnee === "number") {
      kneeFlexions.push((leftKnee + rightKnee) / 2);
    } else {
      const lh = f.joints[LEFT_HIP_KEY];
      const lk = f.joints[LEFT_KNEE_KEY];
      const la = f.joints[LEFT_ANKLE_KEY];
      const rh = f.joints[RIGHT_HIP_KEY];
      const rk = f.joints[RIGHT_KNEE_KEY];
      const ra = f.joints[RIGHT_ANKLE_KEY];
      if (lh && lk && la)
        kneeFlexions.push(
          calculateJointAngle(toPoint3D(lh), toPoint3D(lk), toPoint3D(la))
        );
      if (rh && rk && ra)
        kneeFlexions.push(
          calculateJointAngle(toPoint3D(rh), toPoint3D(rk), toPoint3D(ra))
        );
    }
  }
  const kneeMin = kneeFlexions.length ? Math.min(...kneeFlexions) : 0;
  const kneeMax = kneeFlexions.length ? Math.max(...kneeFlexions) : 0;

  // Hip tilt: pelvic tilt vertical delta, normalized by torso height (then we store in degrees for angle; for delta we normalize)
  const hipTiltsRaw: number[] = [];
  for (const f of list) {
    const l = f.joints[LEFT_HIP_KEY];
    const r = f.joints[RIGHT_HIP_KEY];
    if (l && r) {
      const { verticalDelta } = calculatePelvicTilt(
        toPoint3D(l),
        toPoint3D(r)
      );
      const normDelta = torsoHeightAvg > 0 ? verticalDelta / torsoHeightAvg : 0;
      hipTiltsRaw.push(normDelta);
    }
  }
  const hipTiltMin = hipTiltsRaw.length ? Math.min(...hipTiltsRaw) : 0;
  const hipTiltMax = hipTiltsRaw.length ? Math.max(...hipTiltsRaw) : 0;

  // Arm extension: shoulder-elbow-wrist angle (degrees); larger = more extended
  const armExtensions: number[] = [];
  for (const f of list) {
    const ls = f.joints[LEFT_SHOULDER_KEY];
    const le = f.joints[LEFT_ELBOW_KEY];
    const lw = f.joints[LEFT_WRIST_KEY];
    const rs = f.joints[RIGHT_SHOULDER_KEY];
    const re = f.joints[RIGHT_ELBOW_KEY];
    const rw = f.joints[RIGHT_WRIST_KEY];
    if (ls && le && lw)
      armExtensions.push(
        calculateJointAngle(toPoint3D(ls), toPoint3D(le), toPoint3D(lw))
      );
    if (rs && re && rw)
      armExtensions.push(
        calculateJointAngle(toPoint3D(rs), toPoint3D(re), toPoint3D(rw))
      );
  }
  const armMin = armExtensions.length ? Math.min(...armExtensions) : 0;
  const armMax = armExtensions.length ? Math.max(...armExtensions) : 0;

  // Rhythmic pulse: local minima of mid_hip vertical velocity
  const midHipVelY = midHipVerticalVelocityCurve(list, undefined);
  const pulseIndices = localMinimaIndices(midHipVelY);
  const rhythmicPulseTimes = pulseIndices.map((i) => list[i].timestamp / 1000);

  const profile: BiomechanicalProfile = {};
  if (kneeFlexions.length) {
    profile.knee_flexion_avg = { min: kneeMin, max: kneeMax };
  }
  if (hipTiltsRaw.length) {
    profile.hip_tilt_max = { min: hipTiltMin, max: hipTiltMax };
  }
  if (armExtensions.length) {
    profile.arm_extension_avg = { min: armMin, max: armMax };
  }

  return {
    profile,
    rhythmicPulseTimes,
    torsoHeightAvg,
  };
}

// --- DTW (Dynamic Time Warping) ---

function dtwDistance(
  seqA: number[],
  seqB: number[],
  dist = (a: number, b: number) => Math.abs(a - b)
): number {
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
  const avgMagnitudeA =
    seqA.reduce((s, x) => s + Math.abs(x), 0) / seqA.length || 1;
  const avgMagnitudeB =
    seqB.reduce((s, x) => s + Math.abs(x), 0) / seqB.length || 1;
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
  registrySignatures: {
    moveId: string;
    name: string;
    hipTiltCurve: number[];
    footVelocityCurve: number[];
  }[]
): { moveId: string; name: string; score: number } | null {
  if (registrySignatures.length === 0) return null;
  let best = { moveId: "", name: "", score: 0 };
  for (const reg of registrySignatures) {
    const hipSim = dtwSimilarity(newSignature.hipTiltCurve, reg.hipTiltCurve);
    const footSim = dtwSimilarity(
      newSignature.footVelocityCurve,
      reg.footVelocityCurve
    );
    const score = (hipSim + footSim) / 2;
    if (score > best.score)
      best = { moveId: reg.moveId, name: reg.name, score };
  }
  return best.score > 0 ? best : null;
}
