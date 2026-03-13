/**
 * Comparison Engine (Math Second): pure, testable comparison of student vs teacher motion.
 * - DTW aligns student and teacher frame sequences.
 * - calculateSimilarity compares frame tension, isolation, and placement.
 * - Returns score 0–1 and correction tips.
 */

import type { PoseFrame, PoseData } from "@/types/dance";
import { getMidHip } from "./mid-hip";
import { getTorsoHeight } from "./signature-calculator";

const VIS = 0.5;
const LEFT_HIP = "left_hip";
const RIGHT_HIP = "right_hip";
const LEFT_SHOULDER = "left_shoulder";
const RIGHT_SHOULDER = "right_shoulder";
const LEFT_ANKLE = "left_ankle";
const RIGHT_ANKLE = "right_ankle";
const LEFT_WRIST = "left_wrist";
const RIGHT_WRIST = "right_wrist";

function midShoulder(joints: PoseFrame["joints"]): { x: number; y: number } | null {
  const l = joints[LEFT_SHOULDER];
  const r = joints[RIGHT_SHOULDER];
  if (!l || !r || l.visibility < VIS || r.visibility < VIS) return null;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

function joint(j: PoseFrame["joints"], key: string) {
  const p = j[key];
  return p && p.visibility >= VIS ? p : null;
}

// --- Frame-to-frame distance for DTW (lower = more similar) ---
function frameDistance(student: PoseFrame, teacher: PoseFrame): number {
  const sim = calculateSimilarity(student, teacher);
  return 1 - sim.overall;
}

/**
 * Dynamic Time Warping: align student sequence to teacher sequence.
 * Returns the alignment path (student index i, teacher index j) and the total cost.
 */
export function dtwAlign(
  studentFrames: PoseFrame[],
  teacherFrames: PoseFrame[],
  distanceFn: (a: PoseFrame, b: PoseFrame) => number = frameDistance
): { path: { i: number; j: number }[]; cost: number } {
  const n = studentFrames.length;
  const m = teacherFrames.length;
  if (n === 0 || m === 0) return { path: [], cost: Infinity };

  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  const prev: ({ i: number; j: number } | null)[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(null));

  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    const c = distanceFn(studentFrames[i - 1], teacherFrames[0]);
    dp[i][0] = dp[i - 1][0] + c;
    prev[i][0] = { i: i - 1, j: 0 };
  }
  for (let j = 1; j <= m; j++) {
    const c = distanceFn(studentFrames[0], teacherFrames[j - 1]);
    dp[0][j] = dp[0][j - 1] + c;
    prev[0][j] = { i: 0, j: j - 1 };
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = distanceFn(studentFrames[i - 1], teacherFrames[j - 1]);
      const a = dp[i - 1][j] + cost;
      const b = dp[i][j - 1] + cost;
      const c = dp[i - 1][j - 1] + cost;
      const best = Math.min(a, b, c);
      dp[i][j] = best;
      if (best === a) prev[i][j] = { i: i - 1, j };
      else if (best === b) prev[i][j] = { i, j: j - 1 };
      else prev[i][j] = { i: i - 1, j: j - 1 };
    }
  }

  const path: { i: number; j: number }[] = [];
  let i = n,
    j = m;
  while (i > 0 || j > 0) {
    path.push({ i: i - 1, j: j - 1 });
    const p = prev[i][j];
    if (!p) break;
    i = p.i;
    j = p.j;
  }
  path.reverse();
  return { path, cost: dp[n][m] };
}

export interface SimilarityResult {
  overall: number;
  tension: number;
  isolation: number;
  placement: number;
  tips: string[];
}

/**
 * Compare a single student frame to a teacher frame.
 * - Tension: shoulder-to-hip alignment (vertical stack).
 * - Isolation: hip tilt vs shoulder stability (match teacher’s tilt/stability).
 * - Placement: foot and hand coordinates (normalized by torso height).
 * Returns score in [0, 1] and optional correction tips for this frame.
 */
export function calculateSimilarity(
  studentFrame: PoseFrame,
  teacherFrame: PoseFrame
): SimilarityResult {
  const tips: string[] = [];
  const sj = studentFrame.joints;
  const tj = teacherFrame.joints;

  const tH = getTorsoHeight(tj) || 1;
  const sH = getTorsoHeight(sj) || 1;
  const norm = Math.max(tH, sH, 0.001);

  // --- Tension: shoulder-to-hip alignment (vertical alignment) ---
  const sMidHip = getMidHip(sj);
  const sMidSh = midShoulder(sj);
  const tMidHip = getMidHip(tj);
  const tMidSh = midShoulder(tj);
  let tension = 1;
  if (sMidHip && sMidSh && tMidHip && tMidSh) {
    const sOffset = sMidSh.x - sMidHip.x;
    const tOffset = tMidSh.x - tMidHip.x;
    const dx = Math.abs(sOffset - tOffset) / norm;
    tension = Math.max(0, 1 - dx * 5);
    if (tension < 0.7) {
      if (sOffset > tOffset + 0.02) tips.push("Lower your shoulders");
      else if (sOffset < tOffset - 0.02) tips.push("Keep shoulders over hips");
    }
  }

  // --- Isolation: hip tilt vs shoulder stability ---
  const sLh = joint(sj, LEFT_HIP);
  const sRh = joint(sj, RIGHT_HIP);
  const sLs = joint(sj, LEFT_SHOULDER);
  const sRs = joint(sj, RIGHT_SHOULDER);
  const tLh = joint(tj, LEFT_HIP);
  const tRh = joint(tj, RIGHT_HIP);
  const tLs = joint(tj, LEFT_SHOULDER);
  const tRs = joint(tj, RIGHT_SHOULDER);
  let isolation = 1;
  if (sLh && sRh && tLh && tRh) {
    const sHipTilt = sLh.y - sRh.y;
    const tHipTilt = tLh.y - tRh.y;
    const hipDiff = Math.abs(sHipTilt - tHipTilt) / norm;
    let shoulderDiff = 0;
    if (sLs && sRs && tLs && tRs) {
      const sShTilt = sLs.y - sRs.y;
      const tShTilt = tLs.y - tRs.y;
      shoulderDiff = Math.abs(sShTilt - tShTilt) / norm;
    }
    isolation = Math.max(0, 1 - (hipDiff + shoulderDiff) * 3);
    if (isolation < 0.7) tips.push("Match hip and shoulder level to the reference");
  }

  // --- Placement: feet and hands ---
  const sLa = joint(sj, LEFT_ANKLE);
  const sRa = joint(sj, RIGHT_ANKLE);
  const sLw = joint(sj, LEFT_WRIST);
  const sRw = joint(sj, RIGHT_WRIST);
  const tLa = joint(tj, LEFT_ANKLE);
  const tRa = joint(tj, RIGHT_ANKLE);
  const tLw = joint(tj, LEFT_WRIST);
  const tRw = joint(tj, RIGHT_WRIST);
  let placement = 1;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number } | null) =>
    b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  let totalDist = 0;
  let count = 0;
  if (sLa && tLa) {
    totalDist += dist(sLa, tLa);
    count++;
  }
  if (sRa && tRa) {
    totalDist += dist(sRa, tRa);
    count++;
  }
  if (sLw && tLw) {
    totalDist += dist(sLw, tLw);
    count++;
  }
  if (sRw && tRw) {
    totalDist += dist(sRw, tRw);
    count++;
  }
  if (count > 0) {
    const avgDist = totalDist / count / norm;
    placement = Math.max(0, 1 - avgDist * 4);
    if (placement < 0.7) {
      if (sLa && tLa && dist(sLa, tLa) / norm > 0.08) tips.push("Adjust left foot placement");
      if (sRa && tRa && dist(sRa, tRa) / norm > 0.08) tips.push("Adjust right foot placement");
      if (sLa && sRa && tLa && tRa) {
        const sSpread = Math.hypot(sLa.x - sRa.x, sLa.y - sRa.y);
        const tSpread = Math.hypot(tLa.x - tRa.x, tLa.y - tRa.y);
        if (tSpread > 0 && sSpread / norm < (tSpread / norm) * 0.85)
          tips.push("Step wider");
      }
      if (sLw && tLw && dist(sLw, tLw) / norm > 0.1) tips.push("Bring left hand closer to reference");
      if (sRw && tRw && dist(sRw, tRw) / norm > 0.1) tips.push("Bring right hand closer to reference");
    }
  }

  const overall = (tension + isolation + placement) / 3;
  return { overall, tension, isolation, placement, tips };
}

/** Joint keys we consider for bloom (visible limbs). */
const BLOOM_JOINT_KEYS = [
  "left_wrist",
  "right_wrist",
  "left_ankle",
  "right_ankle",
  "left_elbow",
  "right_elbow",
  "left_knee",
  "right_knee",
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
] as const;

/**
 * Returns joint keys where student position is within threshold of teacher (for Bloom effect).
 * @param thresholdNorm Normalized distance threshold (e.g. 0.07 = 7% of torso height).
 */
export function getMatchingJointKeys(
  studentFrame: PoseFrame,
  teacherFrame: PoseFrame,
  thresholdNorm: number = 0.07
): string[] {
  const sj = studentFrame.joints;
  const tj = teacherFrame.joints;
  const norm = Math.max(getTorsoHeight(tj), getTorsoHeight(sj), 0.001);
  const matching: string[] = [];
  for (const key of BLOOM_JOINT_KEYS) {
    const s = joint(sj, key);
    const t = joint(tj, key);
    if (s && t) {
      const d = Math.hypot(s.x - t.x, s.y - t.y) / norm;
      if (d <= thresholdNorm) matching.push(key);
    }
  }
  return matching;
}

export interface CorrectionTip {
  message: string;
  count?: number;
  severity: "low" | "medium" | "high";
}

export interface ComparisonResult {
  score: number;
  correctionTips: CorrectionTip[];
  metrics: {
    tensionAvg: number;
    isolationAvg: number;
    placementAvg: number;
    alignedPairs: number;
  };
}

/**
 * Compare full student motion to teacher motion using DTW alignment.
 * Returns overall score 0–1 and a list of correction tips (with optional count).
 */
export function compareStudentToTeacher(
  studentMotion: PoseData,
  teacherMotion: PoseData,
  options?: { teacherPartnerId?: 0 | 1; studentPartnerId?: 0 | 1 }
): ComparisonResult {
  const studentFrames = (options?.studentPartnerId != null
    ? studentMotion.frames.filter((f) => f.partner_id === options.studentPartnerId)
    : studentMotion.frames) as PoseFrame[];
  const teacherFrames = (options?.teacherPartnerId != null
    ? teacherMotion.frames.filter((f) => f.partner_id === options.teacherPartnerId)
    : teacherMotion.frames) as PoseFrame[];

  if (studentFrames.length === 0 || teacherFrames.length === 0) {
    return {
      score: 0,
      correctionTips: [{ message: "No motion data to compare", severity: "high" }],
      metrics: { tensionAvg: 0, isolationAvg: 0, placementAvg: 0, alignedPairs: 0 },
    };
  }

  const { path } = dtwAlign(studentFrames, teacherFrames);
  const n = path.length;
  const tipCounts = new Map<string, { count: number; severity: number }>();

  let tensionSum = 0;
  let isolationSum = 0;
  let placementSum = 0;
  let pairCount = 0;

  for (let k = 0; k < path.length; k++) {
    const { i, j } = path[k];
    const studentFrame = studentFrames[i];
    const teacherFrame = teacherFrames[j];
    const sim = calculateSimilarity(studentFrame, teacherFrame);
    tensionSum += sim.tension;
    isolationSum += sim.isolation;
    placementSum += sim.placement;
    pairCount += 1;

    const count = Math.round((k / Math.max(n - 1, 1)) * 8) + 1;
    for (const msg of sim.tips) {
      const key = msg;
      const existing = tipCounts.get(key);
      const sev = sim.overall < 0.5 ? 2 : sim.overall < 0.7 ? 1 : 0;
      if (!existing || sev > existing.severity) {
        tipCounts.set(key, {
          count: existing ? Math.min(existing.count + 1, 8) : Math.min(count, 8),
          severity: Math.max(sev, existing?.severity ?? 0),
        });
      }
    }
  }

  const alignedPairs = pairCount;
  const tensionAvg = pairCount ? tensionSum / pairCount : 0;
  const isolationAvg = pairCount ? isolationSum / pairCount : 0;
  const placementAvg = pairCount ? placementSum / pairCount : 0;
  const score = (tensionAvg + isolationAvg + placementAvg) / 3;

  const correctionTips: CorrectionTip[] = Array.from(tipCounts.entries())
    .sort((a, b) => b[1].severity - a[1].severity)
    .slice(0, 8)
    .map(([message, { count: c, severity }]) => ({
      message: c > 0 && c <= 8 ? `${message} on count ${c}` : message,
      count: c,
      severity: (severity === 2 ? "high" : severity === 1 ? "medium" : "low") as
        | "low"
        | "medium"
        | "high",
    }));

  return {
    score,
    correctionTips,
    metrics: {
      tensionAvg,
      isolationAvg,
      placementAvg,
      alignedPairs,
    },
  };
}
