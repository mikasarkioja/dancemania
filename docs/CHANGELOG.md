# Changelog

Summary of notable changes to the DanceAI (Boutique Studio) app.

---

## Creator Supply Chain & Commercial Strategy (2025-03)

### Save to Registry (server action)

- **`src/features/admin/actions/registry-actions.ts`**: Refactored to a **server action** (`"use server"`). Uses `createClient` from `@/lib/supabase/server`. Accepts `videoId`, `startTime`, `endTime`, `label`, `category`, optional `role`. Fetches `motion_dna` and `genre` from `dance_library`, slices frames by time range (with `timestampToSec` for ms/sec), enforces minimum 10 frames for a valid move. Calls `computeMoveSignature` on the segment, builds `BiomechanicalProfile` (hip_tilt_curve, foot_velocity_curve, knee_flexion_curve), validates all three curves are present and non-empty via `validateBiomechanicalProfile`, then inserts into `move_registry` with genre inherited from the source video. Returns `SaveToRegistryResult` (`{ success: true }` or `{ success: false, error: string }`); no client-side toast in this file.
- **DictionaryLab** (`src/features/admin/components/DictionaryLab.tsx`): Save to Registry button calls the server action with `startTime: 0`, `endTime: durationSec || 999`. On success shows boutique toast: `'{label}' has been added to the Gold Standard Registry! ✨`; on error shows `toast.error(result.error)`. Button shows `Loader2` spinner and "Saving…" while `isSaving`; disabled when no signature, no move name, or saving.

### Genre mode & filtering

- **`move_registry.genre`**: Migration `20250121000011_move_registry_genre.sql` adds optional `genre` (salsa | bachata | other) and index. Save to Registry now sets genre from the source video.
- **Genre context & server**: `src/lib/genre-server.ts` and `src/contexts/` (e.g. genre provider/cookie) for Salsa/Bachata mode. Header genre switcher and layout; dashboard, library, encyclopedia, admin dictionary/label/review and move_registry filters scoped by genre where applicable. Documented in `docs/GENRE_MODE.md`.
- **Admin upload form sync with master switch**: `AdminUpload.tsx` now reads the global genre from `useAppGenre()` (same as the header Salsa/Bachata toggle). The form’s Genre field defaults to and stays in sync with the master switch; the Genre dropdown only shows the current app genre plus “Other” (e.g. when Bachata is selected, only Bachata and Other are available). Helper text added: “Matches the Salsa/Bachata toggle in the header. Switch there to add videos for the other genre.”

### Docs & UX

- **`docs/COMMERCIAL_STRATEGY_AUDIT.md`**: Product/BA audit vs Commercial Strategy (Founding Member, Creator Marketplace, Freemium). Value-creation audit, gap analysis, revenue logic (Stripe/credits/XP not yet implemented), Lead Architect note on motion_dna supply vs orphaned math, UX (PracticeCapture/AssessmentFlow), Privacy (biometric/GDPR), feature flags (AUDIO_COACH, PARTNER_MODE), prioritized backlog (Must-Have for Monday vs Expansion), value-at-risk report, and Kill List (demo page, Source filter, scout deferred).
- **`docs/MOBILE_IPHONE_UX.md`**: Mobile/iPhone UX notes.
- **AppShell** (`src/components/AppShell.tsx`): Optional app shell/layout wrapper.

### Other updates

- **Label/dictionary/admin pages**: Genre-aware data and filters where applicable.
- **Library**: `StudentLibraryView`, `StudentLibraryFilters` updated for genre.
- **Site header, layout, globals**: Adjustments for genre switcher and styling.
- **label-actions.ts**: Minor updates if any for genre or registry alignment.

---

## Registry integration, session naming & auto-naming (2025-01)

### Move Registry ↔ Motion DNA

- **`src/features/admin/actions/registry-actions.ts`**: Integration between extracted Motion DNA and the Move Registry. When you **Save to Registry** from Dictionary Lab, it fetches `motion_dna` from `dance_library`, slices the segment, runs `computeMoveSignature`, and inserts a `move_registry` row with `biomechanical_profile` (hip_tilt_curve, foot_velocity_curve, knee_flexion_curve) as the Gold Standard. Documented in `docs/MOTION_DNA_PIPELINE_AUDIT.md`.
- **Dictionary Lab**: Save button uses `saveMoveToRegistry` with `videoId`, `selection.start`/`selection.end`, `label`, `category`, optional `genre`; state renamed to `isSaving`; success logging. BPM and genre passed from dictionary page for future use.

### Creative Director & session naming

- **`src/engines/naming-engine.ts`**: Creative Director – builds prompts for boutique-style session names from BPM, genre, and top moves. Exports `buildSessionNamingPrompt`, `parseSessionNames`, `getMockSessionNames`. Prompt: luxury dance brand, aspirational names, avoid generic (e.g. "Salsa 1").
- **`src/app/actions/generate-session-names.ts`**: Server action `generateSessionNames(bpm, genre, top_moves)` – calls OpenAI or Anthropic, returns 3 names; fallback mock names. `updatePracticeSessionName(sessionId, name)` updates `practice_sessions.session_name`.
- **`practice_sessions.session_name`**: Migration `20250119000009_practice_sessions_session_name.sql` adds optional `session_name` for user-chosen or suggested names.
- **SessionNamePicker** (`src/features/practice/components/SessionNamePicker.tsx`): Rose-gold pill-style UI with 3 name suggestions and **Roll the Dice** for new ones. Shown after a student saves a practice session; on pick, session is updated and CoachingCard is shown.
- **PracticeCapture**: After save, fetches 3 names via `generateSessionNames` (using `bpm`, `genre`, `instructions[].pattern`), shows name picker card; on select or roll, updates session and logs. Practice page passes `bpm` from `dance_library`.

### Video processing & auto-naming (Python)

- **`scripts/process_pending.py`**: Scanner placeholder + **auto-naming**. `generate_pro_name(bpm, genre, filename)` – boutique name only when filename is generic (`IMG_`, `video_`, `v_`); BPM fallback → `Studio Session - [Timestamp]`. `resolve_display_name(bpm, genre, title, current_display_name)` – only suggests update when title is generic and `display_name` is empty (never overwrites manual names). `run_auto_name(supabase, video_id)` and `apply_display_name_on_update(...)` for pipeline integration. CLI: `--auto-name` to set `display_name` for generic titles; logs `[auto-name] <id>: <name>` to terminal.
- **`dance_library.display_name`**: Migration `20250120000010_dance_library_display_name.sql` adds optional `display_name`; set only for generic titles by auto-naming.
- **`scripts/requirements.txt`**: `supabase>=2.0.0` for process_pending DB access.
- **README-auto-label.md**: Documented `--auto-name` option and no-overwrite behavior.

### Docs & config

- **MOTION_DNA_PIPELINE_AUDIT.md**: Integration map updated (Dictionary Lab → registry-actions → move_registry); 5.1 and 5.3 marked done; summary table updated for signature-calculator and BiomechanicalProfile.
- **.env.example**: Optional keys for extraction, OpenAI/Anthropic, app URL, and Python service role note.

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
