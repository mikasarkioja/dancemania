# Changelog

Summary of notable changes to the DanceAI (Boutique Studio) app.

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

| Path | Description |
|------|-------------|
| `/` | Home (See demo, Library, Encyclopedia, Practice, Admin) |
| `/demo` | Capability overview |
| `/dashboard` | Student dashboard (auth required) |
| `/onboarding` | Initial assessment flow (5 steps) |
| `/library` | Browse teacher videos |
| `/practice` | Practice hub → library |
| `/practice/[videoId]` | PracticeCapture or PracticePlayer |
| `/encyclopedia` | Move registry |
| `/admin` | Admin upload & dictionary |
| `/login` | Login (redirect target for unauthenticated dashboard) |
