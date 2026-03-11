/**
 * Beat-snap (quantization) for dance labeling: align move boundaries to the
 * music's beat grid so labels start on the 1 or the 5 (Salsa/Bachata).
 */

/** Default: if placement is further than this from a beat, do not snap (allow syncopation). */
export const SNAP_SENSITIVITY_SEC = 0.15; // 150ms

/**
 * Find the nearest beat timestamp to currentTime using binary search.
 * If the nearest beat is within sensitivitySec, return that beat; otherwise return currentTime.
 * @param currentTime - Time in seconds (e.g. video currentTime)
 * @param beatTimestamps - Sorted array of beat times in seconds (from metadata.beat_timestamps)
 * @param sensitivitySec - Max distance (seconds) to snap; beyond this, return currentTime
 * @returns Snapped time in seconds (either nearest beat or unchanged currentTime)
 */
export function findNearestBeat(
  currentTime: number,
  beatTimestamps: number[],
  sensitivitySec: number = SNAP_SENSITIVITY_SEC
): number {
  if (!beatTimestamps.length) return currentTime;

  const idx = binarySearchLe(beatTimestamps, currentTime);
  const candidates: { t: number; dist: number }[] = [];

  if (idx >= 0) candidates.push({ t: beatTimestamps[idx], dist: Math.abs(currentTime - beatTimestamps[idx]) });
  if (idx + 1 < beatTimestamps.length) {
    candidates.push({
      t: beatTimestamps[idx + 1],
      dist: Math.abs(currentTime - beatTimestamps[idx + 1]),
    });
  }

  if (candidates.length === 0) return currentTime;
  const nearest = candidates.reduce((a, b) => (a.dist <= b.dist ? a : b));
  return nearest.dist <= sensitivitySec ? nearest.t : currentTime;
}

/**
 * Binary search: largest index i such that beatTimestamps[i] <= value.
 * Returns -1 if value < beatTimestamps[0].
 */
function binarySearchLe(arr: number[], value: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  if (hi < 0 || value < arr[0]) return -1;
  if (value >= arr[hi]) return hi;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= value) lo = mid;
    else hi = mid;
  }
  return arr[hi] <= value ? hi : lo;
}

/**
 * Index of the beat at or just before currentTime. -1 if before first beat.
 */
export function indexOfBeatAtOrBefore(
  currentTime: number,
  beatTimestamps: number[]
): number {
  if (!beatTimestamps.length || currentTime < beatTimestamps[0]) return -1;
  return binarySearchLe(beatTimestamps, currentTime);
}

/**
 * Next beat after currentTime (strictly greater). null if past last beat.
 */
export function getNextBeat(
  currentTime: number,
  beatTimestamps: number[]
): number | null {
  if (!beatTimestamps.length) return null;
  const idx = indexOfBeatAtOrBefore(currentTime, beatTimestamps);
  if (idx < 0) return beatTimestamps[0];
  if (idx + 1 < beatTimestamps.length) return beatTimestamps[idx + 1];
  return null;
}

/**
 * Previous beat before currentTime (strictly less). null if before first beat.
 */
export function getPrevBeat(
  currentTime: number,
  beatTimestamps: number[]
): number | null {
  if (!beatTimestamps.length) return null;
  const idx = indexOfBeatAtOrBefore(currentTime, beatTimestamps);
  if (idx <= 0) {
    if (beatTimestamps[0] < currentTime) return beatTimestamps[0];
    return null;
  }
  return beatTimestamps[idx - 1];
}
