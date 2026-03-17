# Label Verification & MAL Infrastructure — Audit

**Roles:** Lead Architect, UX Strategist, Modular Strategist  
**Scope:** AI proposals, suggested labels, Approved/Rejected states, and Tinder-style verification UI.

---

## 1. Existing MAL Logic

| Location                                                        | Purpose                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/features/admin/actions/label-actions.ts`**               | `runAutoLabel(videoId)` compares motion_dna to move_registry (DTW on hip/foot curves), writes **suggested_labels** to `dance_library`. `approveSuggestedLabel(video_id, move_id, start_time, end_time)` inserts into **video_moves** and removes from suggested_labels. `rejectSuggestedLabel(...)` removes from suggested_labels only. |
| **`dance_library.suggested_labels`**                            | JSONB array of `{ startTime, endTime, move_id, move_name, similarity? }`. No separate `pending_verification` table; pending = suggested_labels on each video.                                                                                                                                                                           |
| **`src/features/admin/components/VideoLabeler.tsx`**            | Timeline with registry suggestions as chips; **one-click Approve (✓) and Reject (✗)** per suggestion. No swipe, no segment video preview in a card.                                                                                                                                                                                     |
| **`src/features/admin/components/AdminVerificationTinder.tsx`** | Boilerplate: list of AI_PROPOSAL, prev/next, Approve/Reject buttons. No video, no swipe, no glassmorphism card.                                                                                                                                                                                                                         |
| **`src/app/admin/label/[id]/video-labeler-wrapper.tsx`**        | Wires VideoLabeler to `approveSuggestedLabel` / `rejectSuggestedLabel`; passes suggestedLabels from page.                                                                                                                                                                                                                               |

**Verdict:** MAL exists. Suggested labels live on **dance_library.suggested_labels**. Approved state = row in **video_moves**; Rejected = removed from suggested_labels. No swipe, no segment-video card, no thumb-zone-optimized verification flow.

---

## 2. Schema (No Change Required)

- **dance_library:** already has `suggested_labels` (JSONB). Best place for AI proposals per video.
- **video_moves:** junction video_id ↔ move_id; approval adds a row here.
- **move_registry:** Gold Standard; approve links video to existing move (signature already in registry from Scanner match). Optional future: on approve, recompute signature from segment and update move_registry.biomechanical_profile for reinforcement.

---

## 3. Integration Points for Tinder UI

- **Data:** Same as today: fetch `dance_library` row with `suggested_labels`, `video_url`, `genre`, `bpm`. Flatten to a list of “pending” items: each suggestion + video context.
- **Approve:** Keep using `approveSuggestedLabel(video_id, move_id, start_time, end_time)`. Move is already in registry; no extra computeMoveSignature needed for basic approval. Optional later: server action to “refresh” Gold Standard from segment.
- **Reject:** Keep using `rejectSuggestedLabel(video_id, move_id, start_time, end_time)`.
- **UI:** New **LabelVerificationCard** (segment video, label, confidence, BPM/genre, swipe + thumb-zone buttons). **LabelVerificationStack** shows one card at a time; used on `/admin/label/[id]` when `suggested_labels.length > 0`.
- **Integrity / Gold Standard:** On approve we only link video ↔ move via `video_moves`. The move’s Gold Standard (biomechanical_profile) already exists in move_registry (Scanner matched against it). Optional future: server action to recompute signature from the approved segment and update `move_registry.biomechanical_profile` to reinforce the Gold Standard.

---

## SalsaAgent MAL schema and migration

- **Types:** `@/types/mal.ts` defines `SalsaAgentMetadata`, `AI_PROPOSAL`, `LabelSuggestion`, `MALSegment`, `BiomechanicalSummary`, `MALProposalStatus`, plus `isSalsaAgentMetadata` and `salsaAgentMetadataToTinderShape`.
- **Promotion:** `promoteProposalToRegistry(videoId, proposal)` in `@/features/admin/actions/mal-actions.ts` extracts the segment from motion_dna, computes signature, inserts into move_registry (verified), links video_moves, and marks the proposal as approved in ai_proposals.
- **Mock:** `generateMockSalsaAgentProposals(videoId)` in `@/lib/mal/mock-salsa-agent.ts` returns 3–5 mock proposals for testing the Tinder UI.
- **Supabase column (snippet):** See migration `supabase/migrations/20250317000016_dance_library_ai_proposals.sql` (adds `ai_proposals` JSONB, comment, and GIN index).

---

## 4. Gaps Addressed by This Implementation

1. **Tinder-style card** with segment video loop, glassmorphism, Rose Gold aesthetic.
2. **Swipe gestures** (Framer Motion useDrag): right = Approve, left = Edit/Reject modal.
3. **Thumb-zone** Approve (✓) and Reject (✗) buttons for mobile.
4. **Reject/Edit modal** to discard or cancel (optional: “Pick different move” later).
5. **Hardware-accelerated** drag/exit animations.
6. **Single source of truth:** same label-actions and suggested_labels; no new MAL tables.
