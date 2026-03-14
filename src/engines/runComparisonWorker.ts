"use client";

import type {
  ComparisonWorkerInput,
  ComparisonWorkerResult,
} from "./comparison.worker";

/**
 * Runs Sakoe–Chiba DTW comparison in a Web Worker to avoid blocking the main thread.
 * Use when student/teacher frame counts make O(N·M) expensive.
 */
export function runComparisonAsync(
  input: ComparisonWorkerInput
): Promise<ComparisonWorkerResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      harmonyScore: 0,
      worstJointGroup: "Frame",
      timingOffsetMs: 0,
      error: "Comparison worker is not available during SSR",
    });
  }
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL("./comparison.worker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (e: MessageEvent<ComparisonWorkerResult>) => {
        worker.terminate();
        const data = e.data;
        if (data?.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      };
      worker.onerror = () => {
        worker.terminate();
        reject(new Error("Comparison worker failed"));
      };
      worker.postMessage(input);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
