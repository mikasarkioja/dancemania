"use client";

import type { MotionDNA } from "@/types/dance";
import type { SuggestedSegment } from "./segmentation";

/**
 * Runs segmentation in a Web Worker. Falls back to main-thread runSegmentation
 * if Worker is unavailable (e.g. SSR or worker load failure).
 */
export function runSegmentationAsync(
  motionDna: MotionDNA | null,
  fps: number = 30
): Promise<SuggestedSegment[]> {
  if (typeof window === "undefined") {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL("./segmentation.worker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (e: MessageEvent<SuggestedSegment[] | { error: string }>) => {
        worker.terminate();
        const data = e.data;
        if (data && typeof data === "object" && "error" in data) {
          reject(new Error((data as { error: string }).error));
        } else {
          resolve((data as SuggestedSegment[]) ?? []);
        }
      };
      worker.onerror = () => {
        worker.terminate();
        reject(new Error("Segmentation worker failed"));
      };
      worker.postMessage({ motionDna, fps });
    } catch {
      // Fallback: run on main thread (may freeze on very large payloads)
      import("./segmentation").then(({ runSegmentation }) => {
        resolve(runSegmentation(motionDna, fps));
      }).catch(reject);
    }
  });
}
