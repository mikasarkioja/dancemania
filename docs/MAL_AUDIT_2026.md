# Model-Assisted Labeling (MAL) & Automated Labeling Pipeline — Audit 2026

**Roles:** Lead Architect, Modular Strategist, UX Strategist  
**Scope:** Temporal pattern matching, Auto-Tag backend, Tinder-for-Labels UI, Zero-Shot/VLM hooks.

---

## 1. Temporal Pattern Matching (“The Brain”)

### DTW (Dynamic Time Warping)

| Location | Usage |
|----------|--------|
| **`src/engines/signature-calculator.ts`** | Full DTW implementation: `dtwDistance`, `dtwSimilarity`, `compareSignatureToRegistry` (hip-tilt + foot-velocity curves vs move_registry). |
| **`src/app/api/process-dance-video/route.ts`** | **None.** API only calls external extraction service (PoseData/MotionDNA); no DTW or pattern matching in this route. |
| **`src/engines/comparison-engine.ts`** | `dtwAlign` for student vs teacher frame alignment (practice flow). |
| **`src/engines/comparison.worker.ts`** | Sakoe–Chiba band-constrained DTW for harmony score (practice). |
| **`src/app/actions/get-curve-delta-tips.ts`** | Uses `dtwSimilarity` for student vs reference curves (coaching). |
| **`src/engines/candidate-move-job.ts`** | Uses `compareSignatureToRegistry` with `DTW_MATCH_THRESHOLD = 0.7` to skip segments that already match. |

**Verdict:** DTW is implemented and used in **signature-calculator** and label/coaching flows. **process-dance-video** does not perform any DTW or ST-GCN; it only persists MotionDNA from an external service.

### ST-GCN

- **Not found.** No ST-GCN (Spatial-Temporal Graph Convolutional Network) logic in the repo.

### Pattern Library / CoMPAS3D

- **Pattern Library:** Yes. **move_registry** is the pattern library: approved moves with `biomechanical_profile` (e.g. `hip_tilt_curve`, `foot_velocity_curve`) are used as Gold Standard.  
- **CoMPAS3D:** Referenced only in an error message in **`label-actions.ts`**: *"Run the CoMPAS/map script or Python suggest_labels pipeline to populate them."* No direct CoMPAS3D dataset import or schema in the frontend/Node code; population is assumed to be external (Python/script).

### SalsaAgent / open-source weights

- **Not found.** No references to SalsaAgent or external pre-trained weights in the codebase.

---

## 2. Auto-Tag Script (Backend)

### Scanner / runAutoLabel

| Item | Status |
|------|--------|
| **runAutoLabel** | **Present.** `src/features/admin/actions/label-actions.ts`: fetches `motion_dna` and `move_registry` (approved, with curves), slides a window (60 frames, step 15), computes signature per segment, compares via `compareSignatureToRegistry`, writes **suggested_labels** to `dance_library`. |
| **suggested_labels with confidence** | **Present.** Each suggestion includes `similarity` (0–1). Stored in `dance_library.suggested_labels` as array of `{ startTime, endTime, move_id, move_name, similarity }`. |
| **Accuracy/confidence percentage** | Exposed as **similarity** (e.g. 0.73 → 73%). No separate “accuracy” field; similarity is the confidence proxy. |

### Auto-segmentation (micro-actions from long video)

| Item | Status |
|------|--------|
| **Segmentation engine** | **Present.** `src/engines/segmentation.ts`: `getMoveBoundaries` (velocity/rhythm resets), `runSegmentation` returns `SuggestedSegment[]` with `start`, `end`, `label`, `confidence`. |
| **Repetitive cycles** | Boundaries are driven by velocity local minima and tap thresholds (e.g. `TAP_VELOCITY_THRESHOLD`, `RHYTHM_RESET_MIN_VELOCITY`), not explicit cycle detection. So “repetitive cycles” are only partially reflected (rhythm resets), not a full cycle-count model. |
| **Integration** | Segmentation is used by the **Magic Wand** in VideoLabeler (client-side worker `runSegmentationAsync`); it does **not** write to `suggested_labels`. Registry-based suggestions come only from **runAutoLabel** (server). |

**Gap:** Long-video auto-segmentation (Magic Wand) and registry-based auto-label (runAutoLabel) are separate; there is no single pipeline that both segments by cycles and then assigns registry labels to every segment.

---

## 3. “Tinder for Labels” UI (Admin)

### VideoLabeler & DictionaryLab

| Component | Role |
|-----------|------|
| **VideoLabeler.tsx** | Main labeling UI: timeline, breakpoints, segments, **Run auto label**, **suggestedLabels** (registry) and **suggestions** (Magic Wand). |
| **DictionaryLab** | Builds Gold Standard: pick video → compute signature (hip/foot curves) → visualize → save to move_registry via RegistryForm. No proposal/approve flow. |

### Proposed vs Verified state

- **Proposed:** Represented by **suggested_labels** on `dance_library` (and in-memory **suggestions** from Magic Wand).  
- **Verified:** Represented by **video_moves** (and persisted **instructions** segments).  
- There is no explicit `state: "proposed" | "verified"` on a single type; the split is **storage**: `suggested_labels` vs `video_moves` + `instructions`.

### One-click Approve / Reject

- **Registry suggestions (suggestedLabels):** **Present.** Per-suggestion **Approve** (Check) and **Reject** (X) buttons; `onApproveSuggestion` / `onRejectSuggestion` call `approveSuggestedLabel` / `rejectSuggestedLabel` (insert into video_moves and remove from suggested_labels, or just remove).  
- **Magic Wand suggestions:** Only **Confirm** (Check); no Reject. Confidence &lt; 0.6 shown as “Review needed”.  
- **Swipe:** **Missing.** No swipe gesture (e.g. swipe right = approve, left = reject); all actions are button-based.

**Gap:** No dedicated “Tinder” swipe UI; no shared **AI_PROPOSAL** object type used across both registry and segmentation flows.

---

## 4. Zero-Shot & VLM Hooks

- **Not implemented.** No code that maps text descriptions (e.g. “Leader steps back on 1”) to mathematical pose sequences or embeddings.  
- No VLM (Vision-Language Model) or text-to-pose / zero-shot retrieval in the repo.

---

## 5. Similarity Thresholds (Where is “similarity > 0.85”?)

| File | Threshold | Purpose |
|------|-----------|---------|
| **label-actions.ts** | **0.55** (`SIMILARITY_THRESHOLD`) | Run auto label: segment is suggested if DTW match score ≥ 0.55. |
| **scout.ts** | **0.85** | `findRegistryMatchForCluster`: name or cosine similarity of joint-angle signature &gt; 0.85 to link cluster to approved move. |
| **candidate-move-job.ts** | **0.7** (`DTW_MATCH_THRESHOLD`) | Skip segment if it already matches registry (≥ 0.7); otherwise consider as candidate move. |
| **VideoLabeler.tsx** | **0.6** (`REVIEW_NEEDED_THRESHOLD`) | Magic Wand suggestions with confidence &lt; 0.6 shown as “Review needed”. |

**Code gap:** **label-actions** uses **0.55** for writing suggested_labels. The vision’s “similarity > 0.85” for high-confidence auto-approval is only in **scout** (registry match for clusters), not in the Scanner path. So:

- **Missing:** In **label-actions.ts**, there is no branch that auto-approves (or flags as high-confidence) when `match.score >= 0.85`.
- **Missing:** No UI that treats “similarity ≥ 0.85” differently (e.g. one-click “Accept all high-confidence” or badge).

---

## 6. MAL Readiness Score (0–100%)

| Dimension | Weight | Score (0–100) | Notes |
|-----------|--------|---------------|-------|
| Temporal pattern matching (DTW vs registry) | 25% | 85 | DTW + signature vs move_registry in place; no ST-GCN; process-dance-video does not do matching. |
| Auto-tag backend (suggested_labels, confidence) | 25% | 80 | runAutoLabel writes suggested_labels with similarity; segmentation exists but not unified with registry. |
| Admin verification UI (approve/reject) | 25% | 70 | One-click Approve/Reject for registry; no swipe; no shared AI_PROPOSAL; Magic Wand has no reject. |
| Zero-shot / VLM | 15% | 0 | No text-to-pose or VLM. |
| High-confidence (0.85) path | 10% | 20 | 0.85 used only in scout; not in Scanner or UI. |

**Overall MAL Readiness Score: ~62%**

Rough interpretation: **~38% of the vision still requires manual work or is missing:**  
unified segmentation+registry pipeline, swipe/Tinder UX, explicit high-confidence (0.85) handling in Scanner/UI, and any zero-shot/VLM capability.

---

## 7. Code Gaps Summary

1. **`src/features/admin/actions/label-actions.ts`**  
   - **Missing:** “similarity > 0.85” logic (e.g. auto-approve or `confidenceTier: "high"`); threshold is 0.55 only.

2. **`src/app/api/process-dance-video/route.ts`**  
   - **No** DTW, ST-GCN, or Pattern Library comparison; only extraction + save. All matching is in label-actions + signature-calculator.

3. **Labels still 100% manual where:**  
   - No motion_dna (video not processed).  
   - move_registry has no Gold Standard curves (hip_tilt_curve, foot_velocity_curve) for the genre.  
   - User does not run “Run auto label” or does not approve/reject suggestions.

4. **`src/features/admin/components/VideoLabeler.tsx`**  
   - **Missing:** Swipe gesture for Approve/Reject; unified **AI_PROPOSAL** type for both registry and Magic Wand suggestions; “Accept all &gt; 85%” or similar.

5. **Zero-shot / VLM:** No files implement text description → pose sequence or VLM-based labeling.

---

## 8. Implementation Path: Admin Verification UI (AI_PROPOSAL “Tinder” Boilerplate)

A boilerplate structure for an Admin Verification UI that treats all AI suggestions as **AI_PROPOSAL** and supports one-click/swipe-style approve/reject is provided in:

**`src/features/admin/components/AdminVerificationTinder.tsx`**

(See that file for the full boilerplate.)

Summary of the boilerplate:

- **`AI_PROPOSAL`** type: unified suggestion (registry or segmentation) with `source: "scanner" | "magic_wand"`, `confidence`/`similarity`, and segment times.
- **`AdminVerificationTinder`** (or equivalent): list/card of proposals; **Approve** / **Reject** actions; optional keyboard shortcuts (e.g. A/R) and optional swipe (e.g. via pointer events or a swipeable component).
- **Integration:** Parent loads `suggested_labels` + Magic Wand `suggestions`, normalizes to `AI_PROPOSAL[]`, and passes to the Tinder component; on Approve/Reject, call existing `approveSuggestedLabel` / `rejectSuggestedLabel` or Magic Wand confirm/dismiss handlers.

This keeps the current backend (label-actions, suggested_labels, video_moves) unchanged and adds a single UI layer that can later be extended to “similarity > 0.85” auto-badges or bulk accept.
