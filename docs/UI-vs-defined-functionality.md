# DanceAI: UI vs defined functionality

This document compares **what the app claims and implements** (defined functionality) with **what is exposed in the user interface** and identifies missing workflows.

---

## Current UI structure

| Route | Purpose | Exposed in nav |
|-------|---------|----------------|
| `/` | Home: tagline + CTAs (Demo, Library, Encyclopedia, Practice, Admin) | — |
| `/demo` | Capability overview and links to each area | ✅ Demo |
| `/library` | Browse teacher videos, filters, search; cards link to practice | ✅ Library |
| `/practice` | Short description + “← Home”; no video list | ✅ Practice |
| `/practice/[videoId]` | Single video: watch with instructions overlay (PracticePlayer) | Via Library only |
| `/encyclopedia` | Move registry explorer (categories, signatures, tips) | ✅ Encyclopedia |
| `/admin` | Upload, label videos, biomechanical dictionary | ✅ Admin |
| `/admin/label`, `/admin/dictionary`, etc. | Sub-routes | Via Admin |

---

## Defined vs available

### 1. Library ✅

- **Defined:** Browse published videos, search/filter by move, role, difficulty; pick a video to practice.
- **Available:** StudentLibraryView with filters, search, VideoCards. Each card links to `/practice/[videoId]`. Matches.

### 2. Encyclopedia ✅

- **Defined:** Move registry with categories, biomechanical signatures, teacher tips.
- **Available:** MoveExplorer with move list and details. Matches.

### 3. Practice (partial) ⚠️

- **Defined:** “Webcam capture and analysis,” “posture and rhythm analysis,” “guided practice.” Student records attempt → comparison → score + AI coaching tips.
- **Available:**
  - **Practice listing (`/practice`):** Only a short description and “← Home.” No list of videos, no “start from library” CTA. Users must discover Library first, then click a video.
  - **Practice video (`/practice/[videoId]`):** Uses **PracticePlayer** only (video + instructions overlay). **PracticeCapture** (webcam, pose comparison, score, save to `practice_sessions`, trigger AI coaching) is **not mounted** on any route. So the full “practice with webcam and feedback” flow exists in code but is not in the UI.

**Gap:** The full student flow (webcam + comparison + coaching) is implemented in `PracticeCapture` but never used. Users only get “watch video with instructions.”

### 4. AI Coaching ⚠️

- **Defined:** After each practice session, AI generates genre-specific Pro Tips (On1, Frame, Cuban Motion) from comparison metrics; stored in `practice_sessions.metrics.coaching_feedback`.
- **Available:** `generateAndSaveCoachingFeedback` runs after save in PracticeCapture. There is **no CoachingCard (or any UI)** that shows `proTips` / coaching feedback to the user. So tips are generated and stored but never displayed.

**Gap:** Coaching feedback is backend-only; no user-facing screen to view tips after practice.

### 5. Admin ✅

- **Defined:** Upload and label teacher videos; biomechanical dictionary (lab).
- **Available:** Admin dashboard with “Label videos” and “Biomechanical dictionary,” plus upload. Matches.

---

## Missing workflows (summary)

| Functionality | Status | Suggested fix |
|---------------|--------|----------------|
| **Demo** | Was missing | ✅ Added `/demo` page + “Demo” in header + “See demo” on home. |
| **Practice entry** | `/practice` doesn’t guide to library | Add CTA on `/practice`: “Browse library to practice” → `/library`. |
| **Webcam + comparison + score** | PracticeCapture not used on any page | Use PracticeCapture on `/practice/[videoId]` when `motion_dna` exists; keep PracticePlayer for watch-only or combine. |
| **Coaching tips in UI** | Stored but not shown | Add CoachingCard (or similar) after save in PracticeCapture, or a “View feedback” step that reads `metrics.coaching_feedback`. |

---

## Right-hand card on home

The right card on the homepage (DancingCoach icon) is decorative. The Demo page now explains all capabilities and links to the right routes, so the purpose of each area is clear even if that card stays visual-only.
