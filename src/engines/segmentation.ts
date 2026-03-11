/**
 * Auto-Labeling Draft Engine: move boundary detection and pattern-matching
 * for suggesting instruction segments from motion_dna (MediaPipe/BlazePose).
 */

import { getMidHip } from "@/engines/mid-hip";
import type { MotionDNA, PoseFrame } from "@/types/dance";

/** Suggested segment from segmentation (ghost block). */
export interface SuggestedSegment {
  start: number;
  end: number;
  label: string;
  confidence: number;
}

/** Default FPS for motion_dna (30fps). */
const DEFAULT_FPS = 30;

/** Moving average window size to smooth velocity (reduce MediaPipe jitter). */
const VELOCITY_SMOOTH_WINDOW = 5;

/** Minimum segment length in seconds. */
const MIN_SEGMENT_SEC = 0.5;

/** Window length in seconds for pattern matching. */
const PATTERN_WINDOW_SEC = 2;

/** Foot velocity magnitude above this = "tap" (Bachata 4th/8th beat style). */
const TAP_VELOCITY_THRESHOLD = 0.015;

/** Minimum velocity (normalized) to count as a rhythm reset (local min). */
const RHYTHM_RESET_MIN_VELOCITY = 0.008;

/** Canonical joint angle keys for cosine similarity (consistent vector length). */
const JOINT_ANGLE_KEYS = [
  "left_shoulder_angle",
  "right_shoulder_angle",
  "left_elbow_angle",
  "right_elbow_angle",
  "left_hip_angle",
  "right_hip_angle",
  "left_knee_angle",
  "right_knee_angle",
  "spine_angle",
  "left_ankle_angle",
  "right_ankle_angle",
] as const;

/** One move template: name + average joint-angle vector over a 2s window. */
export interface MoveTemplate {
  id: string;
  name: string;
  /** Flattened joint angles in JOINT_ANGLE_KEYS order, one vector per 2s. */
  vector: number[];
}

/** Stub move templates for Bachata (can be replaced by real library later). */
export const MOVE_TEMPLATES: MoveTemplate[] = [
  { id: "box", name: "Box Step", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => Math.sin(i * 0.5) * 0.3) },
  { id: "pendulo", name: "Pendulo", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => Math.cos(i * 0.4) * 0.25) },
  { id: "completo", name: "Completo", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => (i % 2 === 0 ? 0.2 : -0.2)) },
  { id: "dile", name: "Dile que no", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => Math.sin(i * 0.7) * 0.2) },
  { id: "enchufla", name: "Enchufla", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => Math.cos(i * 0.6) * 0.22) },
  { id: "cbl", name: "Cross body lead", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => (i < JOINT_ANGLE_KEYS.length / 2 ? 0.15 : -0.15)) },
  { id: "open", name: "Open break", vector: new Array(JOINT_ANGLE_KEYS.length).fill(0).map((_, i) => 0.1 * (i % 3 - 1)) },
];

// --- Moving average (smooth jitter) ---

export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize < 1 || values.length === 0) return [...values];
  const half = Math.floor(windowSize / 2);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      sum += values[j];
      count++;
    }
    result.push(count > 0 ? sum / count : values[i]);
  }
  return result;
}

// --- Velocity from positions (per frame) ---

function midHipVelocityAtFrame(
  frames: PoseFrame[],
  frameIndex: number,
  dt: number
): number {
  const prev = frameIndex > 0 ? getMidHip(frames[frameIndex - 1].joints) : null;
  const curr = getMidHip(frames[frameIndex].joints);
  if (!prev || !curr) return 0;
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  return Math.hypot(dx, dy) / (dt || 1);
}

function ankleVelocityAtFrame(
  frames: PoseFrame[],
  frameIndex: number,
  dt: number,
  key: "left_ankle" | "right_ankle"
): number {
  const prev = frameIndex > 0 ? frames[frameIndex - 1].joints[key] : null;
  const curr = frames[frameIndex].joints[key];
  if (!prev || !curr) return 0;
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  return Math.hypot(dx, dy) / (dt || 1);
}

// --- Rhythm reset: local minimum mid_hip velocity or foot tap ---

function findLocalMinima(values: number[], threshold: number): number[] {
  const indices: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    const v = values[i];
    if (v > threshold) continue;
    if (v <= values[i - 1] && v <= values[i + 1]) indices.push(i);
  }
  return indices;
}

function findTapCrossings(
  leftVel: number[],
  rightVel: number[],
  threshold: number
): number[] {
  const indices: number[] = [];
  const combined = leftVel.map((l, i) => Math.max(l, rightVel[i] ?? 0));
  for (let i = 1; i < combined.length; i++) {
    const below = combined[i - 1] < threshold;
    const above = combined[i] >= threshold;
    if (below && above) indices.push(i);
  }
  return indices;
}

// --- Move boundaries from rhythm resets ---

function frameIndexToTime(frameIndex: number, fps: number): number {
  return frameIndex / fps;
}

/**
 * Returns suggested segment boundaries (start/end times) from rhythm resets.
 * Merges close boundaries and enforces minimum segment length.
 */
function getMoveBoundaries(
  frames: PoseFrame[],
  fps: number
): { start: number; end: number }[] {
  if (frames.length < 2) return [];
  const dt = 1 / fps;

  const midHipVel: number[] = [];
  const leftAnkleVel: number[] = [];
  const rightAnkleVel: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    midHipVel.push(midHipVelocityAtFrame(frames, i, dt));
    leftAnkleVel.push(ankleVelocityAtFrame(frames, i, dt, "left_ankle"));
    rightAnkleVel.push(ankleVelocityAtFrame(frames, i, dt, "right_ankle"));
  }

  const smoothMid = movingAverage(midHipVel, VELOCITY_SMOOTH_WINDOW);
  const smoothLeft = movingAverage(leftAnkleVel, VELOCITY_SMOOTH_WINDOW);
  const smoothRight = movingAverage(rightAnkleVel, VELOCITY_SMOOTH_WINDOW);

  const localMins = findLocalMinima(smoothMid, RHYTHM_RESET_MIN_VELOCITY);
  const tapFrames = findTapCrossings(smoothLeft, smoothRight, TAP_VELOCITY_THRESHOLD);
  const allResetFrames = [...new Set([...localMins, ...tapFrames])].sort((a, b) => a - b);

  const durationSec = frames.length / fps;
  const boundaries: { start: number; end: number }[] = [];
  let start = 0;
  for (const frameIdx of allResetFrames) {
    const t = frameIndexToTime(frameIdx, fps);
    if (t - start >= MIN_SEGMENT_SEC) {
      boundaries.push({ start, end: t });
      start = t;
    }
  }
  if (durationSec - start >= MIN_SEGMENT_SEC) {
    boundaries.push({ start, end: durationSec });
  }
  if (boundaries.length === 0 && durationSec >= MIN_SEGMENT_SEC) {
    boundaries.push({ start: 0, end: durationSec });
  }
  return boundaries;
}

// --- Joint angle vector (canonical order) for similarity ---

function frameToJointAngleVector(frame: PoseFrame): number[] {
  const angles = frame.metrics?.joint_angles ?? {};
  return JOINT_ANGLE_KEYS.map((k) => angles[k] ?? 0);
}

function windowToAverageVector(frames: PoseFrame[]): number[] {
  if (frames.length === 0) return new Array(JOINT_ANGLE_KEYS.length).fill(0);
  const sum = new Array(JOINT_ANGLE_KEYS.length).fill(0);
  for (const f of frames) {
    const v = frameToJointAngleVector(f);
    for (let i = 0; i < v.length; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / frames.length);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : Math.max(0, Math.min(1, dot / denom));
}

/**
 * Similarity scorer: 2-second window of motion vs move_templates.
 * Returns best match label and confidence (0–1).
 */
export function similarityScorer(
  windowFrames: PoseFrame[],
  templates: MoveTemplate[] = MOVE_TEMPLATES
): { label: string; confidence: number } {
  const vec = windowToAverageVector(windowFrames);
  let best = { label: "Other", confidence: 0 };
  for (const t of templates) {
    const sim = cosineSimilarity(vec, t.vector);
    if (sim > best.confidence) {
      best = { label: t.name, confidence: sim };
    }
  }
  return best;
}

/**
 * Run full segmentation: move boundaries + pattern labels and confidence.
 * Uses 2-second windows centered on each segment for pattern matching.
 */
export function runSegmentation(
  motionDna: MotionDNA | null,
  fps: number = DEFAULT_FPS
): SuggestedSegment[] {
  if (!motionDna?.frames?.length) return [];
  const frames = motionDna.frames;
  const windowFrameCount = Math.min(
    Math.floor(PATTERN_WINDOW_SEC * fps),
    frames.length
  );

  const boundaries = getMoveBoundaries(frames, fps);
  const suggestions: SuggestedSegment[] = [];

  for (const { start, end } of boundaries) {
    const startFrame = Math.floor(start * fps);
    const endFrame = Math.min(Math.ceil(end * fps), frames.length);
    const segmentFrames = frames.slice(startFrame, endFrame);
    const windowFrames = segmentFrames.length >= windowFrameCount
      ? segmentFrames.slice(0, windowFrameCount)
      : segmentFrames;
    const { label, confidence } = similarityScorer(windowFrames);
    suggestions.push({
      start,
      end,
      label: `Suggested: ${label}`,
      confidence,
    });
  }

  return suggestions;
}
