/**
 * Central.worker.ts – multi-purpose math hub for the Boutique Studio app.
 * Routes by message type; keeps heavy work off the main thread.
 * Use for: computeSignature, stringify large payloads, (future: similarity batch, etc.)
 */

import { computeMoveSignature } from "./signature-calculator";
import type { PoseFrame } from "@/types/dance";
import type { MoveSignature } from "./signature-calculator";

export type CentralWorkerTask =
  | { type: "computeSignature"; frames: PoseFrame[]; partnerId?: 0 | 1 }
  | { type: "stringify"; payload: unknown };

export type CentralWorkerResult =
  | { type: "computeSignature"; signature: MoveSignature }
  | { type: "stringify"; stringified: string }
  | { type: "error"; message: string };

interface WorkerSelf {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<CentralWorkerTask>) => void
  ): void;
  postMessage(message: CentralWorkerResult, transfer?: Transferable[]): void;
}
declare const self: WorkerSelf;

self.addEventListener("message", (event: MessageEvent<CentralWorkerTask>) => {
  try {
    const task = event.data;
    if (task.type === "computeSignature") {
      const signature = computeMoveSignature(task.frames, task.partnerId);
      self.postMessage({
        type: "computeSignature",
        signature,
      });
    } else if (task.type === "stringify") {
      const stringified = JSON.stringify(task.payload);
      self.postMessage({
        type: "stringify",
        stringified,
      });
    } else {
      self.postMessage({
        type: "error",
        message: "Unknown task type",
      });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
