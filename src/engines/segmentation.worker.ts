/**
 * Web Worker for runSegmentation so the UI doesn't freeze on large motion_dna.
 * Must be instantiated with new Worker(new URL('./segmentation.worker.ts', import.meta.url)).
 */

import { runSegmentation } from "./segmentation";
import type { MotionDNA } from "@/types/dance";
import type { SuggestedSegment } from "./segmentation";

self.onmessage = (e: MessageEvent<{ motionDna: MotionDNA | null; fps?: number }>) => {
  const { motionDna, fps } = e.data;
  try {
    const result: SuggestedSegment[] = runSegmentation(motionDna, fps);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
