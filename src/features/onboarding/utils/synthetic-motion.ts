import type { PoseData, PoseFrame, Joint3D } from "@/types/dance";

const FPS = 30;
const DURATION_SEC = 30;

/** Generate a simple standing pose with slight sway for assessment reference. */
function basePose(t: number): Record<string, Joint3D> {
  const sway = 0.02 * Math.sin((t / 1000) * 0.5);
  return {
    left_shoulder: { x: 0.4 + sway, y: 0.35, z: 0, visibility: 1 },
    right_shoulder: { x: 0.6 - sway, y: 0.35, z: 0, visibility: 1 },
    left_hip: { x: 0.42, y: 0.6, z: 0, visibility: 1 },
    right_hip: { x: 0.58, y: 0.6, z: 0, visibility: 1 },
    left_elbow: { x: 0.3, y: 0.5, z: 0, visibility: 1 },
    right_elbow: { x: 0.7, y: 0.5, z: 0, visibility: 1 },
    left_wrist: { x: 0.25, y: 0.65, z: 0, visibility: 1 },
    right_wrist: { x: 0.75, y: 0.65, z: 0, visibility: 1 },
    left_knee: { x: 0.42, y: 0.78, z: 0, visibility: 1 },
    right_knee: { x: 0.58, y: 0.78, z: 0, visibility: 1 },
    left_ankle: { x: 0.42, y: 0.95, z: 0, visibility: 1 },
    right_ankle: { x: 0.58, y: 0.95, z: 0, visibility: 1 },
  };
}

export function createSyntheticTeacherMotion(): PoseData {
  const frames: PoseFrame[] = [];
  for (let i = 0; i < FPS * DURATION_SEC; i++) {
    const t = (i / FPS) * 1000;
    frames.push({
      timestamp: t,
      partner_id: 0,
      joints: basePose(t),
      metrics: { rhythm_pulse: 0.5, joint_angles: {} },
    });
  }
  return {
    frames,
    durationMs: DURATION_SEC * 1000,
    source: "teacher",
  };
}
