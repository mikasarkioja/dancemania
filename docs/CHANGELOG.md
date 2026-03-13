# Changelog

Summary of notable changes to the DanceAI (Boutique Studio) app.

---

## AI-Assisted Labeling & Move Registry (2025-01)

### Database

- **`dance_library.suggested_labels`** (JSONB): Scanner output – array of `{ startTime, endTime, move_id, move_name, similarity }` for Quick Approve in Admin Lab. Migration: `20250120000008_dance_library_suggested_labels.sql`.
- **`video_moves`** admin policies: INSERT/UPDATE for authenticated users so Approve Suggestion can write. Migration: `20250120000009_video_moves_admin_policies.sql`.
- **`move_registry.source`** (TEXT): Origin e.g. `compas3d_gold_standard` | `user_contributed`. Migration: `20250121000010_move_registry_source_and_vector_sequence.sql`.
- **`biomechanical_profile.vector_sequence`**: Optional array of feature vectors (number[][]) for DTW / Shazam-style matching (CoMPAS3D import).

### Python scripts

- **`scripts/process_pending.py`**: Scanner – fetches Gold Standard moves from `move_registry`, runs `suggest_labels(motion_dna, registry_profiles)`, saves result to `dance_library.suggested_labels`. Supports `vector_sequence` (DTW) and hip_tilt/foot_velocity curves. Usage: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/process_pending.py` or `--video-id <uuid>`.
- **`scripts/map_compas_to_supabase.py`**: Rosetta Stone – maps CoMPAS3D (SMPL-X) .npz to move_registry: SMPL-X → MediaPipe joint names, builds `vector_sequence` and upserts with `source: compas3d_gold_standard`. Usage: `python scripts/map_compas_to_supabase.py --data-dir ./datasets/compas3d/segments`.
- **Bachata tap detection**: `detect_bachata_tap(frames, beat_timestamps, start_time_sec, end_time_sec)` – looks for vertical (Z) hip spike on every 4th beat; when pattern matches and the best match is a Bachata move (e.g. Bachata Basic), confidence is boosted in `suggest_labels`. Uses `motion_dna.metadata.beat_timestamps` when available.
- **`scripts/requirements.txt`**: supabase, numpy, python-dotenv.

### Admin UI – Dictionary Lab & Label

- **Dictionary page** (`/admin/dictionary`): Fetches `suggested_labels`, shows video + progress bar with **ghost blocks** (semi-transparent rose) and **Quick Approve Sidebar** (glassmorphism cards, Jump to / Approve / Reject, timeline strip).
- **Label page** (`/admin/label/[id]`): Loads `suggested_labels`, passes to VideoLabeler; ghost blocks and Approve (check) commit to `video_moves` and remove from `suggested_labels` via shared **`approveSuggestion`** (later **`approveSuggestedLabel`** in features).
- **QuickApproveCard** (`QuickApproveCard.tsx`): Move name (serif), Badge “X% Match”, timestamp link (Jump to), Reject (X), Approve (Wand2, brand-rose). Used inside QuickApproveSidebar.
- **Server action** `approveSuggestion` in `src/app/admin/actions.ts`: inserts `video_moves`, appends segment to `instructions`, removes suggestion from `suggested_labels`.

### Admin UI – Approval logic & sidebar

- **`src/features/admin/actions/label-actions.ts`**: `approveSuggestedLabel(video_id, move_id, start_time, end_time)` – validates move in `move_registry`, inserts `video_moves`, removes that suggestion from `dance_library.suggested_labels`. `rejectSuggestedLabel(...)` only removes from `suggested_labels`.
- **QuickApproveSidebar**: Vertical scroll, glassmorphism cards, confidence ring, Jump to / Approve (Sparkles) / Reject (X), timeline ghost blocks; AnimatePresence for card exit. Uses `approveSuggestedLabel` / `rejectSuggestedLabel`.
- **LabelSwipeStack** (`LabelSwipeStack.tsx`): Swipeable card stack (Framer Motion drag). Swipe right → Approve (rose overlay), left → Reject (slate overlay). Card: 2s looping video segment + ghost skeleton overlay, move name (serif), “X% Match”, duration. Stacked cards behind; empty state “Studio Clean ✨” + “Process More Videos”.

### Move Registry & CoMPAS3D

- **Admin Move Registry** (`/admin/registry`): New page – **Source** filter (All | CoMPAS3D Gold Standards | User Contributed), **virtual scrolling** (@tanstack/react-virtual) for 2,000+ entries. Rows show name, category, role, source badge.
- **MoveRegistryView** + **MoveRegistryVirtualList**: Client filter by source; virtualizer for list. Admin nav link “Move Registry →”.
- **Types**: `SuggestedLabel`, `MoveRegistrySource`, `BiomechanicalProfile.vector_sequence`; `MoveRegistryEntry.source`.

### Routes reference (updated)

| Path              | Description                                 |
| ----------------- | ------------------------------------------- |
| `/admin/registry` | Move Registry (source filter, virtual list) |

---

## Recent updates (Boutique Studio & student experience)

### Demo & navigation

- **Demo page** (`/demo`): Capability overview (Library, Encyclopedia, Practice, AI Coaching, Admin) with CTAs. Added "Demo" and "Dashboard" to site header; home primary CTA is "See demo".
- **Practice page** (`/practice`): Clear copy and "Browse library to practice" CTA.
- **Documentation**: `docs/UI-vs-defined-functionality.md` – UI vs defined functionality and missing workflows.

### Practice & coaching

- **PracticeCapture on `/practice/[videoId]`**: When a video has `motion_dna`, the page shows the full capture flow (webcam, teacher video, comparison, save). Otherwise it shows PracticePlayer and a short “no pose data yet” message.
- **CoachingCard** (`src/components/coaching/CoachingCard.tsx`): Post-save UI with Harmony score, AI Pro Tips, "Try again" and "Back to library". Shown after saving a practice session when coaching feedback is returned from the server action.
- **generate-coaching-feedback** action now returns the feedback object so the client can display it without a second request.
- **Fix**: `DanceInstructions` / `MoveSegment` typing for PracticePlayer (instructions include `teacherInstruction`).
- **Fix**: Missing `lastCoachingResult` state in PracticeCapture (Vercel build).

### Student dashboard

- **Route**: `src/app/(student)/dashboard/page.tsx` – server page; redirects to `/login` if not authenticated.
- **Data**: Fetches user name, last 7 days of `practice_sessions` (chart + Bloom), recent videos for “Continue learning”, and a random move from `move_registry` for “Move of the day”.
- **DashboardView** (`src/features/dashboard/components/DashboardView.tsx`):
  - Header: “Welcome back to the studio, [Name] ✨” (serif) and **Activity Ring** (brand-rose, weekly Bloom goal 5 sessions).
  - **Move of the day**: Name, category, “Practice now” (brand-rose) → Encyclopedia.
  - **Weekly Bloom**: Recharts Area chart, Harmony Score last 7 days, gradient brand-rose → transparent.
  - **Continue learning**: Horizontal carousel of cards (blurred thumbnail, Progress Bloom icon) → `/practice/[videoId]`.
  - Staggered fade-in-up (Framer Motion), brand-champagne background, cards: `backdrop-blur-md`, `bg-white/60`, `rounded-2xl`.
- **Utility**: `.scrollbar-hide` in `globals.css` for the carousel.

### Splash screen & loading

- **SplashScreen** (`src/components/brand/SplashScreen.tsx`): Boutique Studio splash with infinity-ribbon logo (pathLength draw-on, brand-rose → brand-gold), champagne background pulse, glassmorphism container, “preparing your studio…” / “aligning the music… ✨”, joint-marker loading dots (120 BPM pulse). Accepts `isReady`; on true, exit animation (blur + fade) reveals children.
- **Usage**: Wrap app content and set `isReady` when Supabase/MediaPipe (or other init) is done.

### Initial assessment flow (onboarding)

- **Route**: `/onboarding` – `src/app/onboarding/page.tsx` renders `AssessmentFlow`.
- **AssessmentFlow** (`src/features/onboarding/components/AssessmentFlow.tsx`):
  1. **Step 1**: “Every dancer has a unique signature. Let’s find yours. ✨” + “Start my journey” (brand-rose).
  2. **Step 2**: Studio agreement (GDPR): Dance DNA consent copy + toggles (brand-rose). Biometric consent required to continue.
  3. **Step 3**: Find your rhythm – optional 30s Basic Step video, webcam, Rose Frame (circle), Ghost skeleton overlay. 3–2–1 countdown then 30s capture; student motion built from teacher frame + noise (same pattern as PracticeCapture).
  4. **Step 4**: “Processing your signature…” with pulsing joint marker; runs `compareStudentToTeacher` + `getAssessmentLevel`, then moves to step 5.
  5. **Step 5**: “You have a natural {Level}'s grace! 💃” + Harmony score + “Open my Studio Dashboard” → `/dashboard`.
- **Level logic** (`src/engines/comparison-engine.ts`): `getAssessmentLevel(result, timingOffsetMs)` → Seedling | Blossom | Performer (rhythm &lt; 150ms, frame stability ≥ 0.8, hip intention).
- **Synthetic teacher motion** (`src/features/onboarding/utils/synthetic-motion.ts`): 30s reference pose for assessment when no Basic Step video/motion_dna is provided.

### Scripts & tooling

- **Video compression** (`scripts/compress-dance-videos.js`): Batch compress dance videos (ffmpeg, H.264, CRF 23, max width 1280). Default: `./videos-to-compress` → `./compressed`. npm script: `npm run compress-videos`. See `scripts/README-compress-videos.md`.

### Config & fixes

- **card.tsx**: `"use client"` and AnimatedCard props limited to `className`, `delay`, `children` (fixes motion.div type error on Vercel).
- **comparison-engine**: Removed unused `totalCounts`; added `getAssessmentLevel` and `AssessmentLevel` type.
- **coaching-engine.ts**, **generate-coaching-feedback.ts**, **mediapipe-pose-to-frame.ts**: Added so Vercel build and practice flow have all required modules.

---

## Routes reference

| Path                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `/`                   | Home (See demo, Library, Encyclopedia, Practice, Admin) |
| `/demo`               | Capability overview                                     |
| `/dashboard`          | Student dashboard (auth required)                       |
| `/onboarding`         | Initial assessment flow (5 steps)                       |
| `/library`            | Browse teacher videos                                   |
| `/practice`           | Practice hub → library                                  |
| `/practice/[videoId]` | PracticeCapture or PracticePlayer                       |
| `/encyclopedia`       | Move registry                                           |
| `/admin`              | Admin upload, dictionary, Move Registry                 |
| `/admin/registry`     | Move Registry (source filter, virtual list)             |
| `/admin/dictionary`   | Biomechanical dictionary (Lab) + Quick Approve Sidebar  |
| `/admin/label/[id]`   | Label video + suggested labels (ghost blocks, Approve)  |
| `/login`              | Login (redirect target for unauthenticated dashboard)   |
