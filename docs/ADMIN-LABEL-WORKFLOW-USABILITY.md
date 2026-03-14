# Admin segmenting & auto-label – usability review

**Role: Usability specialist.** This doc reviews admin functionality for segmenting videos and auto-labeling for the dance library, verifies defined automation is in use, and proposes workflow and design improvements.

---

## 1. Current admin functionality (verified)

### 1.1 Move labeling page (`/admin/label/[id]`)

| Feature                          | In use? | Notes                                                                                                                                                                                                    |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Breakpoints (Step 1)**         | ✅      | Add breakpoint here, Suggest from beats (every 4), Convert to segments. One click per boundary.                                                                                                          |
| **Start / End Move**             | ✅      | Manual segment boundaries (legacy flow).                                                                                                                                                                 |
| **Pattern dropdown**             | ✅      | Large list (move_registry names + Salsa/Bachata patterns).                                                                                                                                               |
| **Teacher instruction**          | ✅      | Free text; stored per segment with pattern. **Saved with segment** when you click **Update segment** (for selected segment) and persisted to DB when you click **Save instructions**.                    |
| **Update segment**               | ✅      | Select segment in list → change Pattern + Teacher instruction → **Update segment** (writes to local state).                                                                                              |
| **Save instructions**            | ✅      | Persists full `instructions` (all segments: startTime, endTime, pattern, teacherInstruction) to `dance_library.instructions`. **Requires authenticated user** (RLS). Now shows success or error message. |
| **Run auto label**               | ✅      | Server action: sliding window + registry curves → `suggested_labels`. Shows message when 0 results (e.g. no Gold Standard curves in registry).                                                           |
| **Approve / Reject suggestions** | ✅      | Ghost blocks for suggested_labels; Approve → video_moves + remove from suggested_labels; Reject → remove from suggested_labels.                                                                          |
| **Magic Wand**                   | ✅      | Client-side segmentation (motion_dna) → suggested segments; confirm adds to list with pattern.                                                                                                           |

### 1.2 Other admin flows

- **Admin label list** → pick video → opens Move labeling for that video.
- **Admin Review** (`/admin/review/[id]`) → video + skeleton overlay (when motion_dna exists), Approve & Publish / Reject.
- **Dictionary Lab** (`/admin/dictionary`) → 3D playback + hip-tilt/foot-velocity from motion_dna; videos with motion_dna only.
- **Move Registry** → filter by source, virtual list of moves.

---

## 2. Bugs addressed

- **“Save instructions button does not work”**
  - Cause: Update could fail (e.g. RLS: only authenticated users can update) with no feedback.
  - Fix: Save is async; we check Supabase response and show **“Saved. Teacher instructions and patterns are stored.”** or an error (e.g. “Sign in as admin if using RLS”). Button shows “Saving…” while in progress.

- **“Teacher instruction is not saved to pattern”**
  - Each segment stores both **pattern** and **teacherInstruction** in `dance_library.instructions`.
  - You must click **Update segment** after editing the selected segment (so local state is updated), then **Save instructions** (so the whole list is written to the DB).
  - If Save failed silently before, it looked like teacher instruction wasn’t saved; with the new feedback, success/failure is clear.

---

## 3. Suggested workflow (automation + engagement)

Use the existing features in this order so automation does the heavy lifting and the user stays in control.

### Phase A – Break video into segments (minimal clicks)

1. Open **Admin → Label** → select video.
2. **Step 1 – Set breakpoints**
   - Option A: Scrub to each boundary, click **Add breakpoint here** (one click per boundary).
   - Option B: If beat data exists, click **Suggest from beats (every 4)** then add/remove breakpoints as needed.
3. Click **Convert to segments**.  
   → You get a list of segments (pattern “Other”, empty instruction). No need to use Start/End Move for every segment.

### Phase B – Get suggestions (automation)

4. Click **Run auto label** (if the video has motion_dna and the registry has Gold Standard curves).
   - If suggestions appear: use **Approve** on ghost blocks to link moves to the video and remove from suggested list.
   - If 0 results: read the message under the button (e.g. add curves to move_registry or run Python Scanner).
5. Optional: **Magic Wand** for client-side segmentation and confirm suggestions into the segment list.

### Phase C – Label and instruct (engagement)

6. For each segment in the list:
   - Click the segment (so it’s selected and the form shows its pattern + teacher instruction).
   - Set **Pattern** and **Teacher instruction**.
   - Click **Update segment**.
7. Click **Save instructions**.
   - You should see **“Saved. Teacher instructions and patterns are stored.”** (or an error if not signed in / RLS).

Result: segments are defined quickly (breakpoints or auto), then the user focuses on naming and teaching text, with clear feedback on save.

---

## 4. Automation features – verification

| Feature                          | Where                      | Purpose                                                                                                  |
| -------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Breakpoints → segments**       | Label page                 | Reduces manual Start/End clicks; one click per boundary.                                                 |
| **Suggest from beats (every 4)** | Label page                 | Uses motion_dna beat_timestamps to propose phrase boundaries (e.g. Bachata 1–2–3–4).                     |
| **Run auto label**               | Label page (server)        | Compares motion_dna to move_registry (hip_tilt_curve, foot_velocity_curve); writes suggested_labels.     |
| **Approve suggestion**           | Label page                 | Turns a suggestion into video_moves + removes from suggested_labels.                                     |
| **Magic Wand**                   | Label page (client)        | Segments motion_dna locally; user confirms into segment list.                                            |
| **Python Scanner**               | scripts/process_pending.py | Batch suggest_labels (e.g. vector_sequence DTW); writes suggested_labels. User then uses app to Approve. |

All of the above are wired and in use. Run auto label returns 0 suggestions when the registry has no curves; the in-app message explains that.

---

## 5. Proposals for better workflow and design

1. **Auto-save or “Unsaved changes”**
   - Option A: Debounced auto-save after Update segment or after segment list change.
   - Option B: Show “Unsaved changes” when segments differ from last saved, and keep one explicit **Save instructions** click.  
     → Reduces risk of losing work and clarifies when data is persisted.

2. **Inline edit in segment list**
   - Allow editing pattern (and optionally teacher instruction) directly in the list row (e.g. dropdown + input or expand row), with **Update** or auto-apply, instead of requiring select → form → Update segment.  
     → Fewer steps and clearer that both pattern and teacher instruction belong to that segment.

3. **Bulk set pattern**
   - Select multiple segments (e.g. checkboxes) and “Set pattern to X” / “Set instruction to Y” for all.  
     → Faster when many segments share the same move or instruction.

4. **Run auto label → prefill segment list**
   - Option: when Run auto label returns suggestions, offer “Create segments from suggestions” so suggested time ranges become segments (with move name as pattern and empty instruction), then user refines and adds teacher instruction.  
     → Closer to “automate first, then refine.”

5. **Admin must be signed in**
   - Document that **Save instructions** (and any dance_library update) requires an authenticated user (RLS). Add a sign-in gate or banner on the label page when the user is anonymous so “Save doesn’t work” is explained before they try.

6. **Progress / checklist**
   - Small checklist or progress line: “Breakpoints set → Segments created → Labels/instructions filled → Saved.”  
     → Keeps the user oriented in the three-phase workflow.

7. **Keyboard shortcuts**
   - e.g. Space: play/pause; S: Save; Enter: Update segment when one is selected.  
     → Speeds up repeated labeling.

---

## 6. Summary

- **Teacher instruction** is stored per segment and persisted when you **Update segment** (state) and **Save instructions** (DB). Save now shows success or error (e.g. RLS).
- **Save instructions** now checks the Supabase response and shows “Saved” or the error message; **router.refresh()** runs after a successful save.
- Recommended workflow: **breakpoints (or beats) → convert to segments → Run auto label (and/or Magic Wand) → Approve suggestions → fill pattern + teacher instruction per segment → Save instructions.**
- All defined automation (breakpoints, suggest from beats, Run auto label, Approve, Magic Wand, Python Scanner) is in use; improving feedback (save, auto-label message) and adding small UX improvements (inline edit, unsaved indicator, sign-in note) will keep the workflow clear and engaging.
