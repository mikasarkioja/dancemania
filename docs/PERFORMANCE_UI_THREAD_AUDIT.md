# UI Thread Blockers – Performance Audit

**Role:** Senior Performance Engineer & Web Worker Specialist  
**Objective:** Identify heavy computational tasks that should be migrated to Web Workers for a consistent 60fps/120fps "Boutique Studio" experience.

---

## 1. Performance Bottlenecks (Table)

| Location                                                                       | What runs                                                                          | Est. cost                              | When                                                      | Risk                                                                                                  |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **PracticeCapture** `tick` (rAF)                                               | `getMatchingJointKeys(student, teacher)` + `calculateSimilarity(student, teacher)` | ~2–6 ms/frame                          | Every frame (~60fps)                                      | **High** – runs inside requestAnimationFrame; can push frame over 16.6 ms (60fps) or 8.3 ms (120fps). |
| **PracticeCapture** `tick`                                                     | `drawSkeleton(ctx, joints, w, h)` × 2 (teacher ghost + student)                    | ~0.5–1.5 ms                            | Every frame                                               | Low – drawing is relatively cheap; scaling is `x*width, y*height` only.                               |
| **DictionaryLab** `useMemo`                                                    | `computeMoveSignature(motionDna.frames, 0)`                                        | ~15–80 ms                              | When user selects a video (e.g. 30s @ 30fps = 900 frames) | **Medium** – blocks main thread on video switch; UI freezes briefly.                                  |
| **DictionaryLab** `useMemo`                                                    | `chartData` from signature (array from hipTiltCurve/footVelocityCurve)             | ~2–10 ms                               | After signature computed                                  | Low – depends on signature.                                                                           |
| **label-actions** `runAutoLabel`                                               | `computeMoveSignature(segment)` in loop + `compareSignatureToRegistry`             | ~50–200+ ms                            | When admin clicks "Run Scanner" (server action)           | **Medium** – server-side; client waits for response; no direct rAF impact but perceived latency.      |
| **AssessmentFlow** `tick` (rAF)                                                | `drawSkeleton(ctx, teacherFrame.joints, w, h)`                                     | ~0.3–1 ms                              | Every frame                                               | Low.                                                                                                  |
| **VideoReviewer** `draw` (rAF)                                                 | `getFramesAtTime(displayDna, currentTime, FPS)` + 2× `drawSkeleton`                | ~0.5–2 ms                              | Every frame                                               | Low–medium – getFramesAtTime is a lookup; drawing dominates.                                          |
| **PracticeCapture** `handleStop` → Supabase `.insert({ student_motion_data })` | JSON serialization of `studentMotion` (e.g. 30s × 30fps × ~33 joints × 4 numbers)  | ~20–150 ms                             | On "Stop & Save"                                          | **High** – large payload (1–5 MB) stringified on main thread before send; UI can freeze.              |
| **comparison-engine** `compareStudentToTeacher`                                | `dtwAlign` (O(N·M)) + path loop with `calculateSimilarity` per pair                | Already moved to **comparison.worker** | After stop                                                | **Mitigated** – worker handles DTW.                                                                   |
| **runSegmentation**                                                            | Pattern matching + velocity/angle curves over full motion_dna                      | Already in **segmentation.worker**     | Admin / auto-label                                        | **Mitigated** – worker used via runSegmentationAsync.                                                 |

---

## 2. Web Worker Candidates

| Candidate                             | Current main-thread work                                                                  | Proposed strategy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Payload (postMessage)                                                                       | Expected gain                                                                                  | Async waiting in UI                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Signature (30s move)**              | `computeMoveSignature(frames, 0)` in DictionaryLab useMemo                                | Run in worker when video selected; store result in state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `{ type: "computeSignature", frames: PoseFrame[], partnerId?: 0 \| 1 }`                     | Removes 15–80 ms from main thread on video switch; no UI freeze.                               | Show skeleton/chart placeholder or "Computing signature…" until worker returns `MoveSignature`. |
| **Live similarity (PracticeCapture)** | `getMatchingJointKeys` + `calculateSimilarity` inside rAF every frame                     | Option A: **Throttle** – run similarity every 3rd frame (≈20 fps). Option B: **Worker** – send (studentFrame, teacherFrame) to worker, get back similarity + match keys; risk is 60 postMessages/sec. Option C: **Batch** – worker receives last N frame pairs, returns N results; main thread uses latest.                                                                                                                                                                                                                                                                                                                                                | `{ type: "similarity", studentFrame, teacherFrame }` or batched array.                      | Keeps rAF under ~2 ms (draw only); similarity updates at 10–20 fps or after worker round-trip. | Use previous similarity value while waiting; or throttle so "waiting" is rare.                  |
| **Skeleton scale/center**             | `drawSkeleton` uses `x*width, y*height` per joint (no centering today)                    | **Pre-calc** is marginal – math is trivial. If we add "center and fit" mode, compute once per canvas resize: `scale = min(w,h) * 0.9`, `offsetX = (w - scale)/2`. Pass scale/offset to draw.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | N/A (main thread, once per resize).                                                         | Small – avoids per-frame extra math if we add fit-to-canvas.                                   | N/A.                                                                                            |
| **Serialization for Supabase**        | `JSON.stringify(studentMotion)` before `.insert()`                                        | Move stringify to a **worker**: worker receives `studentMotion`, returns `JSON.stringify(studentMotion)`. Main thread does `supabase.from(...).insert({ ...rest, student_motion_data: parsedOrString })` – Supabase client accepts object and stringifies internally, so alternative is **worker returns string** and we use a raw insert with pre-stringified JSON (if API allows). Or use **structuredClone** in worker and send back string; then insert with `student_motion_data: JSON.parse(string)` to avoid double stringify. Simpler: do **chunked stringify** or **requestIdleCallback** to stringify in chunks so main thread stays responsive. | `{ type: "stringify", payload: studentMotion }` → worker returns `{ stringified: string }`. | Removes 20–150 ms block from main thread on save.                                              | "Saving…" overlay; disable buttons until worker returns string, then insert.                    |
| **runAutoLabel (Scanner)**            | Server action; client waits.                                                              | Keep server-side; ensure server has enough CPU. Optional: move **runAutoLabel** logic to a **Edge Function or background job** so client gets immediate "Scan started" and polls or uses realtime for results.                                                                                                                                                                                                                                                                                                                                                                                                                                             | N/A for worker (server).                                                                    | Better perceived performance; no main-thread math.                                             | "Scanning…" with progress or polling.                                                           |
| **Central math hub**                  | Multiple entry points (signature, stringify, future: DTW fallback, segmentation fallback) | Single **central.worker.ts** that routes by `type` and runs the right pure function; reduces worker count and reuses one context.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | See draft below.                                                                            | One worker to maintain; shared lifecycle; can add more task types without new files.           | Per-task: same as above (loading states, throttle, or placeholders).                            |

---

## 3. Specific Focus Answers

### SignatureCalculator: Can the average signature of a 30s move be computed in the background?

**Yes.**

- **Current:** DictionaryLab `useMemo` runs `computeMoveSignature(motionDna.frames, 0)` on the main thread when `motionDna` changes (e.g. 900 frames for 30s @ 30fps).
- **Proposal:** When the user selects a video, post `{ type: "computeSignature", frames, partnerId: 0 }` to a worker (or central.worker). Worker calls the same logic as `computeMoveSignature` (or imports a shared pure module). Post back `MoveSignature`. DictionaryLab shows a loading state or placeholder chart until the result arrives, then updates.
- **Payload:** Frames array (clone or transferable not practical for nested objects; structured clone is fine).
- **Gain:** 15–80 ms moved off main thread; no freeze on video switch.

### PracticeCapture: Is the skeleton scaling and centering logic happening on every frame? Can we pre-calculate those offsets?

- **Scaling:** Yes, every frame: `drawSkeleton` does `x * width`, `y * height` for each joint. This is cheap (a few dozen floats).
- **Centering:** There is no centering today; joints are 0–1 and scaled to canvas size.
- **Pre-calc:** If we add "center and fit to canvas," we can compute once per resize: e.g. `scale = Math.min(w, h) * 0.9`, `originX = (w - scale) / 2`, `originY = (h - scale) / 2`, then in draw use `x * scale + originX`. So we’d do one small computation on resize, not every frame.
- **Real bottleneck:** The expensive part is **getMatchingJointKeys** and **calculateSimilarity** in the same rAF. Recommendation: **throttle** (e.g. run every 3rd frame) or move to a worker with a single in-flight request and use previous similarity for the next frame until the worker responds.

### Data Serialization: Is the app freezing when it tries to JSON.stringify a 5MB motion DNA object for Supabase?

- **Risk:** Yes. Inserting `student_motion_data: studentMotion` (or large `motion_dna`) causes the Supabase client (and browser) to serialize the object. For 30s @ 30fps with full joints, payload can be 1–5 MB; `JSON.stringify` on the main thread can take 20–150 ms and block the UI.
- **Proposal:**
  1. **Worker stringify:** Send the object to a worker via structured clone; worker runs `JSON.stringify(payload)` and posts the string back. Main thread then uses that string (e.g. `JSON.parse` in memory and pass object to Supabase if it accepts object, or use a raw body with the string if the API allows). Note: Supabase client typically accepts objects and stringifies internally, so the freeze happens inside the client. To avoid that, we’d need either a worker that produces the string and a way to pass it (e.g. insert with a blob or a custom endpoint), or **requestIdleCallback** + chunked/streamed stringify (complex).
  2. **Simpler:** Do the insert in a **server action** that receives the session metadata and the large payload; server does the stringify and inserts. That moves the cost off the client entirely.
- **Recommendation:** Prefer **server action** for large inserts (client sends payload, server stringifies and writes to DB). If client must send JSON, show a "Saving…" overlay and consider compressing (e.g. gzip) or reducing payload (e.g. store every 2nd frame) to shrink size and shorten stringify time.

---

## 4. Draft: `src/engines/central.worker.ts` (Multi-Purpose Math Hub)

A single worker that routes by message type and runs the corresponding pure math. This keeps one worker lifecycle, one place to add new tasks (e.g. signature, stringify, or future lightweight DTW/segmentation helpers), and avoids spawning many workers.

```ts
/**
 * Central.worker.ts – multi-purpose math hub for the Boutique Studio app.
 * Routes by message type; keeps heavy work off the main thread.
 * Use for: computeSignature, stringify large payloads, (future: similarity batch, etc.)
 */

export type CentralWorkerTask =
  | { type: "computeSignature"; frames: PoseFrame[]; partnerId?: 0 | 1 }
  | { type: "stringify"; payload: unknown };

export type CentralWorkerResult =
  | { type: "computeSignature"; signature: MoveSignature }
  | { type: "stringify"; stringified: string }
  | { type: "error"; message: string };

// Minimal types for worker (no @/ imports in worker if bundler isolates)
interface PoseFrame {
  timestamp: number;
  partner_id?: number;
  joints: Record<
    string,
    { x: number; y: number; z: number; visibility: number }
  >;
  metrics?: { rhythm_pulse?: number; joint_angles?: Record<string, number> };
}

interface MoveSignature {
  averageJointAngles: Record<string, number>;
  velocityCurves: { key: string; values: number[] }[];
  hipTiltCurve: number[];
  footVelocityCurve: number[];
  frameCount: number;
}

function computeSignatureInWorker(
  frames: PoseFrame[],
  partnerId?: 0 | 1
): MoveSignature {
  // Inline or import a pure implementation of computeMoveSignature
  // (same logic as signature-calculator.ts, or import from a shared pure module)
  const list =
    partnerId != null
      ? frames.filter((f) => f.partner_id === partnerId)
      : frames;
  // ... compute averageJointAngles, velocityCurves, hipTiltCurve, footVelocityCurve
  return {
    averageJointAngles: {},
    velocityCurves: [],
    hipTiltCurve: [],
    footVelocityCurve: [],
    frameCount: list.length,
  };
}

self.addEventListener("message", (event: MessageEvent<CentralWorkerTask>) => {
  try {
    const task = event.data;
    if (task.type === "computeSignature") {
      const signature = computeSignatureInWorker(task.frames, task.partnerId);
      (self as Worker).postMessage({
        type: "computeSignature",
        signature,
      } as CentralWorkerResult);
    } else if (task.type === "stringify") {
      const stringified = JSON.stringify(task.payload);
      (self as Worker).postMessage({
        type: "stringify",
        stringified,
      } as CentralWorkerResult);
    } else {
      (self as Worker).postMessage({
        type: "error",
        message: "Unknown task type",
      } as CentralWorkerResult);
    }
  } catch (err) {
    (self as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    } as CentralWorkerResult);
  }
});
```

**Notes for implementation:**

- **computeSignatureInWorker:** Either duplicate the logic from `signature-calculator.ts` inside the worker (no imports from `@/` if the worker bundle is isolated), or build a shared pure module (e.g. `signature-calculator-core.ts`) that both the main bundle and the worker bundle can import, and call that from the worker.
- **stringify:** Use for large objects before Supabase insert if the client is responsible for producing the JSON string; otherwise prefer server-side insert for 5 MB–scale payloads.
- **Extensibility:** Add more `type` branches (e.g. `similarityBatch`, `normalizeFrames`) and corresponding result types as needed.
- **Lifecycle:** Create one worker (e.g. `new Worker(new URL("./central.worker.ts", import.meta.url), { type: "module" })`) and reuse it; terminate on app unmount or when closing the feature that uses it.

---

## 5. Summary

| Priority   | Action                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High**   | Keep DTW in **comparison.worker** (already done). Throttle or move **getMatchingJointKeys** + **calculateSimilarity** out of every rAF in PracticeCapture (throttle to ~10–20 fps or single in-flight worker call). |
| **High**   | Move **JSON.stringify** for large `student_motion_data` off the main thread (worker or server action).                                                                                                              |
| **Medium** | Move **computeMoveSignature** for DictionaryLab to a worker (or central.worker); show "Computing signature…" until result.                                                                                          |
| **Low**    | Pre-calculate scale/offset for skeleton only if you add "center and fit" mode; current per-frame scaling is cheap.                                                                                                  |

This audit gives a clear **table of bottlenecks**, **worker candidates with payloads and UI handling**, and a **draft central.worker** that can act as a multi-purpose math hub for the app.
