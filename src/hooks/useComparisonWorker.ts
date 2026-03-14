"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PoseFrame } from "@/types/dance";
import type {
  ComparisonWorkerResult,
  ComparisonWorkerInput,
} from "@/engines/comparison.worker";

export type ComparisonWorkerState = {
  isProcessing: boolean;
  result: ComparisonWorkerResult | null;
};

/**
 * React hook to run Sakoe–Chiba DTW comparison in a Web Worker.
 * Keeps the main thread free for 60fps; terminates the worker on unmount.
 */
export function useComparisonWorker() {
  const [state, setState] = useState<ComparisonWorkerState>({
    isProcessing: false,
    result: null,
  });
  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((value: ComparisonWorkerResult) => void) | null>(
    null
  );
  const rejectRef = useRef<((reason: Error) => void) | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const worker = new Worker(
      new URL("../engines/comparison.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<ComparisonWorkerResult>) => {
      const data = e.data;
      pendingRef.current = false;
      if (data.error) {
        rejectRef.current?.(new Error(data.error));
      } else {
        resolveRef.current?.(data);
      }
      resolveRef.current = null;
      rejectRef.current = null;
      setState({ isProcessing: false, result: data });
    };

    worker.onerror = () => {
      pendingRef.current = false;
      const err = new Error("Comparison worker failed");
      rejectRef.current?.(err);
      resolveRef.current = null;
      rejectRef.current = null;
      setState((s) => ({ ...s, isProcessing: false }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      resolveRef.current = null;
      rejectRef.current = null;
      pendingRef.current = false;
    };
  }, []);

  const calibrateAndCompare = useCallback(
    (
      studentFrames: PoseFrame[],
      teacherFrames: PoseFrame[],
      options?: Partial<
        Omit<ComparisonWorkerInput, "studentFrames" | "teacherFrames">
      >
    ): Promise<ComparisonWorkerResult> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("Comparison worker not available"));
          return;
        }
        if (pendingRef.current) {
          reject(
            new Error("Already processing; wait for the current run to finish.")
          );
          return;
        }
        pendingRef.current = true;
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setState((s) => ({ ...s, isProcessing: true, result: null }));

        const input: ComparisonWorkerInput = {
          studentFrames,
          teacherFrames,
          ...options,
        };
        worker.postMessage(input);
      });
    },
    []
  );

  return {
    isProcessing: state.isProcessing,
    result: state.result,
    calibrateAndCompare,
  };
}
