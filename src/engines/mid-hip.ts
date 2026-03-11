import type { Joint3D, SeedPoint } from "@/types/dance";

/** BlazePose/MediaPipe-style joint keys for hips. */
export const LEFT_HIP_KEY = "left_hip";
export const RIGHT_HIP_KEY = "right_hip";

/** Default below this visibility we treat the landmark as obscured. */
const DEFAULT_VISIBILITY_THRESHOLD = 0.5;

export interface MidHipPoint {
  x: number;
  y: number;
}

/**
 * Compute mid_hip for a single skeleton. If one hip is obscured (low visibility),
 * use the single visible hip; if both visible, use average. If neither visible, returns null.
 */
export function getMidHip(
  joints: Record<string, Joint3D>,
  visibilityThreshold: number = DEFAULT_VISIBILITY_THRESHOLD
): MidHipPoint | null {
  const left = joints[LEFT_HIP_KEY];
  const right = joints[RIGHT_HIP_KEY];

  const leftVisible = left && left.visibility >= visibilityThreshold;
  const rightVisible = right && right.visibility >= visibilityThreshold;

  if (leftVisible && rightVisible) {
    return {
      x: (left!.x + right!.x) / 2,
      y: (left!.y + right!.y) / 2,
    };
  }
  if (leftVisible) return { x: left!.x, y: left!.y };
  if (rightVisible) return { x: right!.x, y: right!.y };
  return null;
}

function euclideanDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Find the skeleton index whose mid_hip is closest to the click coordinate
 * (Euclidean distance in the same coordinate system – normalized 0–1 or pixels).
 * Use this to assign Leader vs Follower from admin clicks on the first frame.
 *
 * @param clickPoint - Normalized (x,y) from the Admin click
 * @param skeletons - Array of joint maps (e.g. one per detected person in the frame)
 * @param visibilityThreshold - Min visibility to consider a hip landmark visible
 * @returns Index of best-matching skeleton, or -1 if none have a valid mid_hip
 */
export function findBestMatch(
  clickPoint: SeedPoint,
  skeletons: Array<{ joints: Record<string, Joint3D> }>,
  visibilityThreshold: number = DEFAULT_VISIBILITY_THRESHOLD
): number {
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let i = 0; i < skeletons.length; i++) {
    const midHip = getMidHip(skeletons[i].joints, visibilityThreshold);
    if (midHip === null) continue;
    const dist = euclideanDistance(clickPoint, midHip);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}
