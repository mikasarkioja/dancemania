# Motion DNA Pipeline – Integration Audit

**Role:** Senior Software Architect & Biomechanics Usability Specialist  
**Objective:** Ensure mathematical definitions are integrated into application workflows, not isolated.

---

## 1. Integration Map (Successfully Connected)

| From                              | To                                | Connection                                                                                                                                            |
| --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **signature-calculator.ts**       | **DictionaryLab**                 | `computeMoveSignature` used for playback chart (hipTilt, footVelocity) and skeleton; reads `motion_dna` from `dance_library`.                         |
| **signature-calculator.ts**       | **label-actions.ts**              | `computeMoveSignature` + `compareSignatureToRegistry` in `runAutoLabel` (Scanner: motion_dna → move_registry).                                        |
| **signature-calculator.ts**       | **candidate-move-job.ts**         | Uses signature/registry logic (identifyCandidateMoves).                                                                                               |
| **comparison-engine.ts**          | **PracticeCapture**               | `compareStudentToTeacher(teacherPoses, studentPoses)` after session; DTW used inside.                                                                 |
| **comparison-engine.ts**          | **AssessmentFlow**                | `compareStudentToTeacher` for onboarding assessment.                                                                                                  |
| **comparison-engine.ts**          | **coaching-engine.ts**            | `ComparisonResult` imported; `getCoachingFocusAreas` / `buildCoachingPrompt` consume comparison metrics and correctionTips.                           |
| **coaching-engine.ts**            | **generate-coaching-feedback.ts** | Server action calls `getCoachingFocusAreas`, `buildCoachingPrompt`, `parseCoachingResponse`; writes to `practice_sessions.metrics.coaching_feedback`. |
| **generate-coaching-feedback.ts** | **PracticeCapture**               | After comparison, calls `generateAndSaveCoachingFeedback(sessionId, comparisonResult, genre)`; sets `lastCoachingResult` (score, proTips).            |
| **PracticeCapture**               | **CoachingCard**                  | Renders score and proTips from `lastCoachingResult`.                                                                                                  |
| **move_registry**                 | **label-actions**                 | Scanner reads `biomechanical_profile` (hip_tilt_curve, foot_velocity_curve) for Gold Standard comparison.                                             |
| **move_registry**                 | **encyclopedia**                  | Fetches and displays entries (biomechanical_signature, biomechanical_profile, etc.).                                                                  |
| **dance_library.motion_dna**      | **VideoLabeler**                  | Beat-snap uses `metadata.beat_timestamps`; skeleton and segments use frames.                                                                          |
| **dance_library.motion_dna**      | **Dictionary Lab**                | List and detail view; signature charts from `computeMoveSignature(motion_dna.frames)`.                                                                |
| **Dictionary Lab**                | **registry-actions**              | "Save to Registry" calls `saveMoveToRegistry` with video, segment times, label, category.                                                             |
| **registry-actions**              | **move_registry**                 | Computes signature via `computeMoveSignature`, writes curves to `biomechanical_profile` (Gold Standard).                                              |

---

## 2. Orphan Alert (Isolated or Underused)

| Item                                           | Location                                          | Issue                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **generateMoveSignature**                      | `src/engines/signature-calculator.ts`             | Produces `BiomechanicalProfile` (knee_flexion_avg, hip_tilt_max, arm_extension_avg min/max). **Not imported or called anywhere** in the app. Not re-exported from `src/engines/index.ts`. The Scanner uses **curves** from `computeMoveSignature` (hipTiltCurve, footVelocityCurve), not this profile shape. |
| **Python extraction / process_pending.py**     | Not in repo                                       | Docs (CHANGELOG, README-motion-dna, README-auto-label) refer to a pose extraction pipeline and `process_pending.py`. Repo contains **no Python files**. Motion_dna population is documented as external (run your own MediaPipe/BlazePose pipeline and write to `dance_library.motion_dna`).                 |
| **Supabase Edge Function process-dance-video** | `supabase/functions/process-dance-video/index.ts` | Placeholder only: logs that it would call extraction; does **not** call any engine or write `motion_dna`.                                                                                                                                                                                                    |

---

## 3. Broken Links (Data Sent or Available but Not Used)

| Data                                                | Where it comes from                                                                                                                      | Where it’s missing                                                                                                                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **dance_library.bpm**                               | AdminUpload saves BPM to `dance_library` on upload.                                                                                      | No UI reads or displays `bpm` (label page, Dictionary Lab, Review, encyclopedia use other tables/fields).                                                                                                               |
| **BiomechanicalProfile from generateMoveSignature** | Would output ranges (knee_flexion_avg, hip_tilt_max, arm_extension_avg).                                                                 | Nothing calls it; move_registry Scanner expects **curve arrays** (hip_tilt_curve, foot_velocity_curve), not these ranges. So either this function is for a different use (e.g. encyclopedia display) or it’s dead code. |
| **Coaching metrics/correctionTips on UI**           | comparison-engine produces `correctionTips` and metrics (tension, isolation, placement); coaching-engine feeds them into the LLM prompt. | CoachingCard only receives **score** and **proTips**. The numeric metrics and raw correctionTips are not shown in the card (by design they drive the prompt, but could be surfaced for power users).                    |

---

## 4. Type Safety & Integrity

- **TypeScript (`@/types/dance.ts`):**
  - `PoseFrame`: `timestamp`, `partner_id`, `joints`, `metrics: { rhythm_pulse, joint_angles }` (required).
  - `PoseData` / `MotionDNA`: `frames`, `durationMs`, `source?`, `metadata?` (MotionMetadata: `beat_timestamps?`).
  - `BiomechanicalProfile`: `hip_tilt_max`, `knee_flexion_avg`, `arm_extension_avg`, `torso_isolation_index`, `rhythmic_sync_offset` (all optional TargetRange).
- **Python:** No Python code in repo; no direct type comparison. Expected shape is documented in `scripts/README-motion-dna.md` to match PoseData (frames with timestamp, partner_id, joints, optional metrics).
- **Ghost / mismatch:**
  - **Scanner vs types:** label-actions uses `biomechanical_profile` as `{ hip_tilt_curve?: number[]; foot_velocity_curve?: number[] }`. These are **not** on the typed `BiomechanicalProfile` in dance.ts (which has only range fields). So either extend `BiomechanicalProfile` with optional `hip_tilt_curve` and `foot_velocity_curve`, or document a separate “Scanner profile” shape.
  - **PoseFrame.metrics:** Typed as required; in practice frames from extraction may omit `metrics`. label-actions normalizes `timestamp` and `partner_id` but does not backfill `metrics`; signature-calculator handles missing metrics (e.g. computes joint angles from joints). Consider typing `metrics?` as optional for ingested data.

---

## 5. Fix Plan (Concrete Steps)

### 5.1 Dictionary Lab → move_registry (biomechanical_profile) ✅ Done

- **Implementation:** `src/features/admin/actions/registry-actions.ts` is the integration: when you "Save to Registry" from Dictionary Lab, it fetches `motion_dna` from `dance_library`, slices the segment (by `startTimeSec`/`endTimeSec`), runs `computeMoveSignature(segmentFrames, 0)`, and inserts a `move_registry` row with `biomechanical_profile: { hip_tilt_curve, foot_velocity_curve, knee_flexion_curve }` (the Gold Standard). Dictionary Lab calls `saveMoveToRegistry` with video id, segment times, label, and category.
- _Obsolete:_ ~~Add an action (e.g. in admin or Dictionary Lab) that, for a chosen segment or video, runs `computeMoveSignature(segmentFrames, 0)` and then upserts `move_registry` with `biomechanical_profile: { hip_tilt_curve: sig.hipTiltCurve, foot_velocity_curve: sig.footVelocityCurve }` (and optionally name/category from form). Alternatively, a “Suggest move to registry” flow that uses existing candidate-move-job + admin approval and writes these curves when creating the registry entry.

### 5.2 generateMoveSignature – wire or remove

- **Option A (use it):** If you want encyclopedia or admin to show range-based stats (knee flexion, hip tilt, arm extension min/max), call `generateMoveSignature(frames, options)` from Dictionary Lab or from a “Move stats” panel and display the result; optionally save to `move_registry.biomechanical_profile` alongside or instead of curves (would require schema/type extension).
- **Option B (remove):** If the only profile shape you need is curves for the Scanner, consider removing or deprecating `generateMoveSignature` and documenting that `BiomechanicalProfile` for the Scanner is curve-based (see type fix below).
- **Export:** If you keep it, add to `src/engines/index.ts`:  
  `export { generateMoveSignature } from "./signature-calculator";`  
  and export the option/result types if needed.

### 5.3 Type alignment (BiomechanicalProfile vs Scanner) ✅ Done

- `BiomechanicalProfile` in `src/types/dance.ts` already includes optional curve arrays: `hip_tilt_curve`, `foot_velocity_curve`, `knee_flexion_curve`. Scanner (label-actions) and registry-actions use these fields.

### 5.4 BPM (dance_library)

- **Display:** Where it’s useful (e.g. label page header or Dictionary Lab list), load `bpm` from `dance_library` and show it (e.g. “120 BPM”).
- **Query:** Add `bpm` to the `select()` in `app/admin/label/[id]/video-labeler-wrapper.tsx` (and any other dance_library fetches that should show BPM), then pass it to the UI.

### 5.5 CoachingCard and comparison output

- **Optional enhancement:** If you want to show mathematical feedback explicitly, extend CoachingCard props with optional `metrics?: { tensionAvg, isolationAvg, placementAvg }` and/or `correctionTips?: { message }[]`, and pass them from PracticeCapture’s `lastCoachingResult` (extend the stored coaching_feedback or the return type of the server action to include these). No change to comparison-engine or coaching-engine required; only wiring from existing comparison result to the card.

### 5.6 Extraction pipeline (motion_dna)

- **In-repo:** Either add a minimal Python script (or link to an external repo) that implements the documented PoseData shape and writes to `dance_library.motion_dna`, or keep the current “run your own pipeline” stance and document the expected JSON shape and column in one place (README-motion-dna already does this).
- **Edge function:** When you have an extraction service, implement the TODO in `process-dance-video`: call the service with `videoUrl` and `trackingSeeds`, then `updateDanceLibraryRow(rowId, { motion_dna: motionDna })` with the same PoseData shape as in `@/types/dance`.

---

## Summary Table

| Area                                            | Status                                         | Action                                                                                  |
| ----------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Extraction chain (process_pending / motion_dna) | Not in repo; Edge Function placeholder         | Document or add script; implement Edge Function when service exists.                    |
| signature-calculator in Dictionary Lab          | Display + Save to Registry                     | registry-actions saves curves to move_registry when user clicks "Save to Registry".     |
| comparison-engine + DTW                         | Integrated in PracticeCapture & AssessmentFlow | None.                                                                                   |
| comparison → coaching-engine → CoachingCard     | Connected (score + proTips)                    | Optional: surface metrics/correctionTips in CoachingCard.                               |
| generateMoveSignature                           | Orphan                                         | Wire (encyclopedia/admin) or remove; align with BiomechanicalProfile.                   |
| BPM                                             | Stored, not displayed                          | Add BPM to dance_library selects and UI where relevant.                                 |
| BiomechanicalProfile types                      | Aligned                                        | Curve fields (hip_tilt_curve, foot_velocity_curve, knee_flexion_curve) present in type. |
