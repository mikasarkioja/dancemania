/**
 * Map MediaPipe Pose (33 landmarks) to our PoseFrame / joints format.
 * Used by PracticeCapture to build student frames from teacher joints or from MediaPipe output.
 */

import type { PoseFrame, Joint3D, PartnerId } from "@/types/dance";

/** MediaPipe Pose landmark index (0–32) by joint key. */
export const JOINT_KEY_TO_MP_INDEX: Record<string, number> = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

const MP_INDEX_TO_JOINT_KEY = (() => {
  const out: string[] = [];
  for (const [key, idx] of Object.entries(JOINT_KEY_TO_MP_INDEX)) {
    out[idx] = key;
  }
  return out;
})();

export interface LandmarkLike {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Build a PoseFrame from a MediaPipe-style landmarks array (index 0–32).
 */
export function buildPoseFrameFromLandmarks(
  timestamp: number,
  landmarks: LandmarkLike[],
  partner_id: PartnerId
): PoseFrame {
  const joints: Record<string, Joint3D> = {};
  for (let i = 0; i < landmarks.length && i < 33; i++) {
    const key = MP_INDEX_TO_JOINT_KEY[i];
    if (!key) continue;
    const lm = landmarks[i];
    joints[key] = {
      x: lm.x,
      y: lm.y,
      z: lm.z ?? 0,
      visibility: lm.visibility ?? 1,
    };
  }
  return {
    timestamp,
    partner_id,
    joints,
    metrics: {
      rhythm_pulse: 0,
      joint_angles: {},
    },
  };
}
