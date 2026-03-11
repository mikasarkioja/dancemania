/**
 * Get pose frame(s) from motion_dna at a given video currentTime.
 * Uses video.currentTime as master clock; frame index = floor(currentTime * fps).
 */

import type { MotionDNA, PoseFrame, PartnerId } from "@/types/dance";

const DEFAULT_FPS = 30;

/**
 * Returns the Leader (0) and Follower (1) frames at the given time.
 * If motion_dna uses per-frame timestamps, finds closest by timestamp; otherwise uses frame index.
 */
export function getFramesAtTime(
  motionDna: MotionDNA | null,
  currentTime: number,
  fps: number = DEFAULT_FPS
): { leader: PoseFrame | null; follower: PoseFrame | null } {
  if (!motionDna?.frames?.length) {
    return { leader: null, follower: null };
  }
  const frames = motionDna.frames;

  // Prefer frame-index sync (no drift): same as video frame
  const frameIndex = Math.floor(currentTime * fps);
  const byPartner = getFramesByPartner(frames);

  const leader = getFrameAtIndex(byPartner[0], frameIndex) ?? findClosestByTimestamp(byPartner[0], currentTime);
  const follower = getFrameAtIndex(byPartner[1], frameIndex) ?? findClosestByTimestamp(byPartner[1], currentTime);

  return { leader, follower };
}

function getFramesByPartner(frames: PoseFrame[]): [PoseFrame[], PoseFrame[]] {
  const lead: PoseFrame[] = [];
  const follow: PoseFrame[] = [];
  for (const f of frames) {
    if (f.partner_id === 0) lead.push(f);
    else follow.push(f);
  }
  return [lead, follow];
}

function getFrameAtIndex(partnerFrames: PoseFrame[], index: number): PoseFrame | null {
  if (index < 0 || index >= partnerFrames.length) return null;
  return partnerFrames[index];
}

function findClosestByTimestamp(partnerFrames: PoseFrame[], timeSec: number): PoseFrame | null {
  if (!partnerFrames.length) return null;
  const timeMs = timeSec * 1000;
  let best = partnerFrames[0];
  const toMs = (t: number) => (t > 1000 ? t : t * 1000);
  let bestDiff = Math.abs(toMs(best.timestamp) - timeMs);
  for (const f of partnerFrames) {
    const d = Math.abs(toMs(f.timestamp) - timeMs);
    if (d < bestDiff) {
      bestDiff = d;
      best = f;
    }
  }
  return best;
}

/**
 * Swap Leader and Follower in all frames (for "Swap IDs" QC action).
 */
export function swapPartnerIds(motionDna: MotionDNA): MotionDNA {
  return {
    ...motionDna,
    frames: motionDna.frames.map((f) => ({
      ...f,
      partner_id: (1 - f.partner_id) as PartnerId,
    })),
  };
}
