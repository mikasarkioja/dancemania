/**
 * Privacy: Anonymization protocol for pose data.
 * We strip or nullify facial landmark data (MediaPipe indices 0–10) before
 * storing in the database. Only functional joint data (shoulders, hips,
 * knees, etc.) is persisted.
 */

import type { PoseData, PoseFrame } from "@/types/dance";

/** Joint keys that correspond to MediaPipe face landmarks (0–10). Never stored. */
const FACIAL_JOINT_KEYS = new Set([
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
]);

/**
 * Return a new joints object with facial keys removed.
 * Call before persisting PoseData to practice_sessions or any biometric store.
 */
function stripFacialJoints(
  joints: Record<
    string,
    { x: number; y: number; z: number; visibility: number }
  >
): Record<string, { x: number; y: number; z: number; visibility: number }> {
  const out: Record<
    string,
    { x: number; y: number; z: number; visibility: number }
  > = {};
  for (const [key, value] of Object.entries(joints)) {
    if (FACIAL_JOINT_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Return a deep copy of the pose data with facial landmarks stripped from every frame.
 * Use this before saving student_motion_data to the database.
 */
export function anonymizePoseData(data: PoseData): PoseData {
  return {
    ...data,
    frames: data.frames.map((frame: PoseFrame) => ({
      ...frame,
      joints: stripFacialJoints(frame.joints),
    })),
  };
}
