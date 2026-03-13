/**
 * Draw pose skeletons on a canvas from MotionDNA/PoseFrame joints.
 * Joints are assumed to be normalized 0–1 (x, y) or in same coordinate system as canvas.
 * Optional Bloom: when jointMatches is provided, matching joints are drawn with a rose glow.
 */

import type { Joint3D } from "@/types/dance";

/** Pairs of joint keys that form skeleton edges (MediaPipe/BlazePose style). */
const SKELETON_EDGES: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["right_shoulder", "right_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["right_hip", "right_knee"],
  ["left_knee", "left_ankle"],
  ["right_knee", "right_ankle"],
];

const VISIBILITY_THRESHOLD = 0.5;

const BLOOM_COLOR = "rgba(253, 164, 175, 0.9)";
const BLOOM_GLOW = "rgba(253, 164, 175, 0.5)";

export interface DrawSkeletonOptions {
  lineWidth?: number;
  /** Joint keys that match the reference (teacher); drawn with Bloom effect. */
  jointMatches?: Set<string> | string[];
  matchColor?: string;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  joints: Record<string, Joint3D>,
  width: number,
  height: number,
  color: string,
  lineWidth: number = 2,
  options: DrawSkeletonOptions = {}
): void {
  const { jointMatches, matchColor = BLOOM_COLOR } = options;
  const matchSet =
    jointMatches instanceof Set
      ? jointMatches
      : jointMatches
        ? new Set(jointMatches)
        : null;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (const [keyA, keyB] of SKELETON_EDGES) {
    const a = joints[keyA];
    const b = joints[keyB];
    if (!a || !b || a.visibility < VISIBILITY_THRESHOLD || b.visibility < VISIBILITY_THRESHOLD)
      continue;
    const x1 = a.x * width;
    const y1 = a.y * height;
    const x2 = b.x * width;
    const y2 = b.y * height;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (const key of Object.keys(joints)) {
    const j = joints[key];
    if (!j || j.visibility < VISIBILITY_THRESHOLD) continue;
    const x = j.x * width;
    const y = j.y * height;
    const isMatch = matchSet?.has(key);

    if (isMatch) {
      ctx.shadowColor = BLOOM_GLOW;
      ctx.shadowBlur = 15;
      ctx.fillStyle = matchColor;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
