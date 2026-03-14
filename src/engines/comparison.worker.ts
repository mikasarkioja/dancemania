/**
 * Comparison Worker – offloads O(N·M) Sakoe–Chiba DTW to a background thread.
 * Math Second: weighted Euclidean distance, band-constrained DTW, harmony score.
 */

const VIS = 0.5;

const HIP_KEYS = ["left_hip", "right_hip"] as const;
const FEET_KEYS = ["left_ankle", "right_ankle"] as const;
const SHOULDER_KEYS = ["left_shoulder", "right_shoulder"] as const;
const ARM_KEYS = [
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
] as const;

export type JointGroup = "Hips" | "Feet" | "Frame";

interface Joint3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface WorkerPoseFrame {
  timestamp: number;
  partner_id?: number;
  joints: Record<string, Joint3D>;
  metrics?: { rhythm_pulse?: number; joint_angles?: Record<string, number> };
}

export interface JointWeights {
  hips: number;
  feet: number;
  shoulders: number;
  arms: number;
}

const DEFAULT_WEIGHTS: JointWeights = {
  hips: 0.4,
  feet: 0.3,
  shoulders: 0.2,
  arms: 0.1,
};

export interface ComparisonWorkerInput {
  studentFrames: WorkerPoseFrame[];
  teacherFrames: WorkerPoseFrame[];
  jointWeights?: Partial<JointWeights>;
  /** Sakoe–Chiba band radius in frames (default 15). */
  bandFrames?: number;
}

export interface ComparisonWorkerResult {
  harmonyScore: number;
  worstJointGroup: JointGroup;
  timingOffsetMs: number;
  /** Raw DTW cost (for debugging). */
  dtwCost?: number;
  pathLength?: number;
  /** Set when the worker threw; harmonyScore will be 0. */
  error?: string;
}

function getJoint(
  joints: Record<string, Joint3D>,
  key: string
): { x: number; y: number; z: number } | null {
  const p = joints[key];
  if (p == null || typeof p.visibility !== "number" || p.visibility < VIS)
    return null;
  const x = Number(p.x);
  const y = Number(p.y);
  const z = Number(p.z);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null;
  return { x, y, z };
}

function euclidean(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Group distance: average Euclidean distance for the given joint keys.
 * If either side is missing, returns 0 (no contribution).
 */
function groupDistance(
  sa: Record<string, Joint3D>,
  ta: Record<string, Joint3D>,
  keys: readonly string[]
): number {
  let sum = 0;
  let count = 0;
  for (const key of keys) {
    const ps = getJoint(sa, key);
    const pt = getJoint(ta, key);
    if (ps != null && pt != null) {
      sum += euclidean(ps, pt);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * Weighted Euclidean distance between two frames.
 * Returns total cost and per-group costs for error identification.
 * Weights: Hips 0.4, Feet 0.3, Shoulders 0.2, Arms 0.1.
 */
function weightedFrameDistance(
  student: WorkerPoseFrame,
  teacher: WorkerPoseFrame,
  w: JointWeights
): { total: number; hips: number; feet: number; frame: number } {
  const sj = student.joints ?? {};
  const tj = teacher.joints ?? {};
  const dHips = groupDistance(sj, tj, HIP_KEYS);
  const dFeet = groupDistance(sj, tj, FEET_KEYS);
  const dShoulders = groupDistance(sj, tj, SHOULDER_KEYS);
  const dArms = groupDistance(sj, tj, ARM_KEYS);
  const total =
    w.hips * dHips + w.feet * dFeet + w.shoulders * dShoulders + w.arms * dArms;
  const frameContrib = w.shoulders * dShoulders + w.arms * dArms;
  return {
    total,
    hips: w.hips * dHips,
    feet: w.feet * dFeet,
    frame: frameContrib,
  };
}

const SAKOE_CHIBA_BAND = 15;

/**
 * Sakoe–Chiba constrained DTW: only allow |i - j| <= band.
 * Returns path, total cost, and per-group cost sums along the path for worst-group identification.
 */
function dtwSakoeChiba(
  studentFrames: WorkerPoseFrame[],
  teacherFrames: WorkerPoseFrame[],
  weights: JointWeights,
  band: number
): {
  path: { i: number; j: number }[];
  cost: number;
  groupCosts: { hips: number; feet: number; frame: number };
} {
  const n = studentFrames.length;
  const m = teacherFrames.length;
  if (n === 0 || m === 0) {
    return {
      path: [],
      cost: Infinity,
      groupCosts: { hips: 0, feet: 0, frame: 0 },
    };
  }

  const r = Math.min(band, n, m);
  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  const prev: ({ i: number; j: number } | null)[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(null));
  const costHips: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));
  const costFeet: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));
  const costFrame: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));

  dp[0][0] = 0;
  for (let i = 1; i <= n && i <= r; i++) {
    const { total, hips, feet, frame } = weightedFrameDistance(
      studentFrames[i - 1],
      teacherFrames[0],
      weights
    );
    dp[i][0] = dp[i - 1][0] + total;
    prev[i][0] = { i: i - 1, j: 0 };
    costHips[i][0] = costHips[i - 1][0] + hips;
    costFeet[i][0] = costFeet[i - 1][0] + feet;
    costFrame[i][0] = costFrame[i - 1][0] + frame;
  }
  for (let j = 1; j <= m && j <= r; j++) {
    const { total, hips, feet, frame } = weightedFrameDistance(
      studentFrames[0],
      teacherFrames[j - 1],
      weights
    );
    dp[0][j] = dp[0][j - 1] + total;
    prev[0][j] = { i: 0, j: j - 1 };
    costHips[0][j] = costHips[0][j - 1] + hips;
    costFeet[0][j] = costFeet[0][j - 1] + feet;
    costFrame[0][j] = costFrame[0][j - 1] + frame;
  }

  for (let i = 1; i <= n; i++) {
    const jMin = Math.max(1, i - r);
    const jMax = Math.min(m, i + r);
    for (let j = jMin; j <= jMax; j++) {
      const { total, hips, feet, frame } = weightedFrameDistance(
        studentFrames[i - 1],
        teacherFrames[j - 1],
        weights
      );
      const a = dp[i - 1][j] + total;
      const b = dp[i][j - 1] + total;
      const c = dp[i - 1][j - 1] + total;
      const best = Math.min(a, b, c);
      dp[i][j] = best;
      if (best === a) {
        prev[i][j] = { i: i - 1, j };
        costHips[i][j] = costHips[i - 1][j] + hips;
        costFeet[i][j] = costFeet[i - 1][j] + feet;
        costFrame[i][j] = costFrame[i - 1][j] + frame;
      } else if (best === b) {
        prev[i][j] = { i, j: j - 1 };
        costHips[i][j] = costHips[i][j - 1] + hips;
        costFeet[i][j] = costFeet[i][j - 1] + feet;
        costFrame[i][j] = costFrame[i][j - 1] + frame;
      } else {
        prev[i][j] = { i: i - 1, j: j - 1 };
        costHips[i][j] = costHips[i - 1][j - 1] + hips;
        costFeet[i][j] = costFeet[i - 1][j - 1] + feet;
        costFrame[i][j] = costFrame[i - 1][j - 1] + frame;
      }
    }
  }

  const path: { i: number; j: number }[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    path.push({ i: i - 1, j: j - 1 });
    const p = prev[i][j];
    if (p == null) break;
    i = p.i;
    j = p.j;
  }
  path.reverse();

  const cost = dp[n][m];
  const groupCosts = {
    hips: costHips[n][m],
    feet: costFeet[n][m],
    frame: costFrame[n][m],
  };
  return { path, cost, groupCosts };
}

/**
 * Map raw DTW cost to 0–100 Harmony Score (100 = perfect match).
 * Uses path-length normalization and a soft cap so small costs map near 100.
 */
function costToHarmonyScore(cost: number, pathLength: number): number {
  if (pathLength <= 0 || !Number.isFinite(cost)) return 0;
  const avgCostPerStep = cost / pathLength;
  const scale = 0.5;
  const score = 100 * Math.max(0, Math.min(1, 1 - avgCostPerStep / scale));
  return Math.round(score);
}

/**
 * Estimate timing offset in ms: positive = student is ahead of teacher.
 * Input frame timestamps should be in milliseconds so the result is in ms.
 */
function estimateTimingOffsetMs(
  path: { i: number; j: number }[],
  studentFrames: WorkerPoseFrame[],
  teacherFrames: WorkerPoseFrame[]
): number {
  if (path.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const { i, j } of path) {
    const st = studentFrames[i]?.timestamp;
    const tt = teacherFrames[j]?.timestamp;
    if (
      typeof st === "number" &&
      typeof tt === "number" &&
      Number.isFinite(st) &&
      Number.isFinite(tt)
    ) {
      sum += st - tt;
      count++;
    }
  }
  if (count === 0) return 0;
  const avgDiff = sum / count;
  return Math.round(avgDiff);
}

function runComparison(input: ComparisonWorkerInput): ComparisonWorkerResult {
  const studentFrames = input.studentFrames ?? [];
  const teacherFrames = input.teacherFrames ?? [];
  const weights: JointWeights = {
    ...DEFAULT_WEIGHTS,
    ...input.jointWeights,
  };
  const band = Math.max(1, input.bandFrames ?? SAKOE_CHIBA_BAND);

  const { path, cost, groupCosts } = dtwSakoeChiba(
    studentFrames,
    teacherFrames,
    weights,
    band
  );

  const pathLength = path.length;
  const harmonyScore = costToHarmonyScore(cost, pathLength);
  const timingOffsetMs = estimateTimingOffsetMs(
    path,
    studentFrames,
    teacherFrames
  );

  const worstJointGroup: JointGroup =
    groupCosts.hips >= groupCosts.feet && groupCosts.hips >= groupCosts.frame
      ? "Hips"
      : groupCosts.feet >= groupCosts.frame
        ? "Feet"
        : "Frame";

  return {
    harmonyScore,
    worstJointGroup,
    timingOffsetMs,
    dtwCost: cost,
    pathLength,
  };
}

interface WorkerSelf {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ComparisonWorkerInput>) => void
  ): void;
  postMessage(message: ComparisonWorkerResult, transfer?: Transferable[]): void;
}
declare const self: WorkerSelf;

self.addEventListener(
  "message",
  (event: MessageEvent<ComparisonWorkerInput>) => {
    try {
      const result = runComparison(event.data);
      self.postMessage(result);
    } catch (err) {
      self.postMessage({
        harmonyScore: 0,
        worstJointGroup: "Frame" as JointGroup,
        timingOffsetMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
