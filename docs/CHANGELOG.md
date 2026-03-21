# Changelog

Summary of notable changes to the DanceAI (Boutique Studio) app.

---

## Admin Master Console & operator data (2025-03-17)

- **`/admin` (overview only):** Server-side admin gate (`redirect` if not admin). **Studio Pulse** stat bar (dancers, teachers, practices, avg precision), **Sentinel** cookie diagnostic widget, **Teacher performance** + **top practiced videos**, **user directory** (search, pagination, role edit, Bloom badge, join date from `created_at`), boutique sidebar + charcoal shell on the overview page only (sub-routes keep default theme).
- **Data:** `fetchAdminDashboardData()` in `src/features/admin/data/admin-dashboard.ts` — aggregates `profiles`, `practice_sessions`, `dance_library`, `video_usage_logs` (views).
- **Migration** `20250321000021_profiles_created_at.sql`: `profiles.created_at` for join date display.
- **Extraction refactor:** `src/lib/extraction/run-process-dance-video.ts` shared by `POST /api/process-dance-video` (RLS row check + role); private `teacher-uploads` / signed URLs supported.
- **`/admin/users`:** Reuses directory data + dark shell; **resolve-playback-url** for label/review when library rows use storage path only.

## Notifications ledger & Realtime bell (2025-03-17)

- **Migration** `20250323000023_notifications.sql`: enum `notification_type` (`content_approval`, `move_verified`, `xp_milestone`, `system_alert`), table `notifications` (title, message, optional link, `is_read`, `created_at`), RLS SELECT/UPDATE own rows only; triggers — **Bloom** on `profiles` omatase (students only, tier 100/500), **move_verified** when `dance_library` becomes `published`.
- **Server:** `createNotification` + `insertNotification` / `insertNotificationForAllAdmins` (`src/lib/notifications/`, `src/features/notifications/actions/notification-actions.ts`).
- **Automation:** Admins notified on teacher `pending_admin_approval` (`submitTeacherVideoForApproval`); teachers on extraction complete (`runProcessDanceVideoForRow`, `system_alert`); publish + Bloom via DB triggers.
- **UI:** `NotificationBell` in `SiteHeader` — Supabase Realtime INSERT/UPDATE, latest 5, mark-all-read, Framer rose-gold pulse; **BoutiqueToaster** (Sonner) with glass + rose-gold borders.
- **Realtime:** Add `notifications` to Supabase Replication (or `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`).

## Teacher Studio upload & gold-standard handoff (2025-03-17)

- **Route:** `/teacher/upload` — `TeacherStudioUploadForm` + `TeacherRecentUploads` (Realtime on `dance_library` for `creator_id`; enable Replication in Supabase Dashboard if needed).
- **Migration** `20250322000022_teacher_studio_pipeline.sql`: statuses `processing`, `pending_admin_approval`; `description`, `source_bucket`, `storage_object_path`; nullable `video_url` with storage check; private `teacher-uploads` bucket + RLS (folder = `auth.uid()`, admin read-all).
- **Actions:** `processTeacherUpload`, `submitTeacherVideoForApproval`; extraction via `runProcessDanceVideoForRow` (signed URLs for private objects).
- **Admin:** Label queue **Gold-standard review** section; `submitForGoldStandard` on label UI for teachers; `AdminSupplyChainStats` extended.

## Creator ownership, teacher RLS, video usage analytics (2025-03-17)

- **Migration** `20250320000020_creator_ownership_video_usage_rls.sql`: `dance_library.creator_id` and `move_registry.creator_id` (FK → `profiles.id`); backfill from `uploaded_by` then first admin profile; enum `video_usage_action` + table `video_usage_logs` with RLS (insert own user; select own activity, logs for videos you created, or admin).
- **dance_library RLS**: Students/guests **SELECT** only `status = 'published'`; creators and admins see drafts; **INSERT/UPDATE/DELETE** scoped to `creator_id = auth.uid()` with teacher/admin role (JWT `app_metadata` fallback for admin).
- **move_registry / video_moves**: Creator-isolated writes; **SELECT** approved moves for everyone (encyclopedia), pending for owner/admin.
- **Server action** `logVideoActivity` in `src/features/analytics/actions/video-usage-actions.ts`; **hooks** `useVideoViewLog` for `view` on first `playing`.
- **PracticePlayer** + **PracticeCapture**: log `view` on teacher video play; `practice_start` after countdown; `practice_complete` after session saved.
- **Teacher dashboard** `/teacher` (`src/app/(dashboard)/teacher/`): videos you own (or all if admin), views / starts / completion % from `video_usage_logs`. Header nav link **Teacher**.
- **AdminUpload**, **registry-actions**, **mal-actions**: set `creator_id` on insert.

---

## Admin video supply chain workflow (2025-03-17)

- **`docs/ACADEMY_ADMIN_VIDEO_WORKFLOW.md`:** Operator playbook from upload → extraction → label → review → **published** (student Library/Practice). Lists env (`EXTRACTION_SERVICE_URL`, service role), statuses, and code pointers.
- **`/admin`:** “Supply chain: video → students” stepper (upload, extraction, label, review/publish) + note that only `published` rows are student-visible.
- **`/admin/label`:** Fetches `status`; shows color badges (pending extraction, needs labeling, relabeling, published), per-row next-step hints, and explicit **Label** / **Review / Publish** actions.

### Admin pipeline UI & tracking (2025-03-17)

- **`src/lib/admin/video-pipeline-state.ts`:** Derives 4 steps (upload, extraction, labeling, publish) with `done` / `current` / `blocked` / `needsRevisit` for `needs_relabeling`.
- **Components:** `AdminVideoPipelineSteps` (full + compact), `RetryExtractionButton` (POST process-dance-video), `AdminVideoQueueRow`, `AdminSupplyChainStats` (queue counts on `/admin`).
- **Wiring:** `/admin/label` rows show **x/4** + compact stepper + retry when extraction pending; `/admin/label/[id]` + `/admin/review/[id]` show full stepper + contextual CTAs; **AdminUpload** success card with stepper + deep links.
- **`/admin/dictionary`:** Clarified as **optional** relative to the main publish pipeline.

---

## Sentinel, 3-Free Gate, MAL & Coaching (2025-03-17)

### MVP gap & revenue gating

- **`docs/MVP_GAP_ANALYSIS.md`:** Updated readiness to **74%**. Post-Assessment Upsell and Delete/Erasure marked done. Remaining: Stripe checkout, 3-free-practices gate. Added §8 Current Development Gap with effort estimates.
- **3-free-practices gate:** `checkPracticeEntitlement()` in `src/features/practice/actions/usage-actions.ts` counts `practice_sessions` per user; returns `canPractice` (true if count &lt; 3 or `profiles.is_premium`), `currentCount`, `remaining`, `isBypass` (admin/teacher skip). **EliteAccessModal** (glassmorphism, Rose Gold): “You’ve reached the limit of the Digital Mirror”; CTA “Request Founding Access” logs “Upsell Click” to `analytics_events`. **PracticeCapture** gates camera/MediaPipe on entitlement; shows modal when locked. **Dashboard** shows “X of 3 Free Practices Remaining” with Champagne/Gold progress bar; admin/teacher bypass (counter hidden). **Migration** `20250317000017`: `profiles.is_premium`, `analytics_events` table (RLS: insert/select own).

### Model-Assisted Labeling (SalsaAgent)

- **Types:** `src/types/mal.ts` — `SalsaAgentMetadata`, `AI_PROPOSAL`, `LabelSuggestion`, `MALSegment`, `BiomechanicalSummary`, `salsaAgentMetadataToTinderShape`, etc.
- **Migration** `20250317000016`: `dance_library.ai_proposals` JSONB (default `[]`), GIN index.
- **Mock:** `src/lib/mal/mock-salsa-agent.ts` — `generateMockSalsaAgentProposals(videoId)` for testing.
- **Promotion:** `src/features/admin/actions/mal-actions.ts` — `promoteProposalToRegistry(videoId, proposal)` slices motion_dna, computes signature, inserts move_registry + video_moves, marks proposal approved in `ai_proposals`.
- **UI:** `LabelVerificationStackMAL.tsx` normalizes SalsaAgentMetadata to Tinder shape; Approve → promote, Reject → local state. Admin label page: “MAL (SalsaAgent)” and “Load mock SalsaAgent proposals”. **`docs/LABEL_VERIFICATION_AUDIT.md`** updated.

### Digital Sentinel: real-time AI coaching

- **PracticeCapture:** After save, uses **returned** `generateAndSaveCoachingFeedback()` result; sets `lastCoachingResult.proTips` from AI when present, else static fallback; passes `feedbackFailed` when AI returns no tips.
- **CoachingCard:** Prioritizes **AI proTips** over static; **Sentinel Insight** header by `worstJointGroup` (“Focus on Hip Timing” / Footwork / Frame). **Precision Meter** (Champagne → Rose Gold gradient). Framer Motion: card “analyzing → revealed”, staggered tip reveal. **General Mastery** fallback when `feedbackFailed`: amber card, “Keep consistency—your movement is being refined.” **`generateAndSaveCoachingFeedback`:** Guardian: `getUser()` at start; select/update scoped by `.eq("user_id", user.id)`; logs when no LLM response.
- **Past sessions:** `getSessionCoachingFeedback(sessionId)` in `src/features/practice/actions/session-actions.ts` (Guardian: RLS); returns `proTips`, `worstJointGroup`, `harmonyScore` from `practice_sessions.metrics`. Exported from practice feature.

### Auth & identity (Sentinel audit)

- **`docs/AUTH_AUDIT.md`:** Middleware sync, client/server Supabase, server action security, RLS scan, redirect/callback. Tracks which actions call `getUser()`; recommends tightening `dance_library` INSERT/UPDATE to admin/teacher.
- **Middleware:** Always call `getUser()` (not `getSession()`) so JWT is validated/refreshed and cookies written to response — **fixes login desync**.
- **Auth callback** `src/app/auth/callback/route.ts`: PKCE `exchangeCodeForSession(code)`; **safe redirect** via `isSafeRedirectPath(next)` (default `/dashboard`); **double-callback** handled (if session exists, redirect without re-exchange). Error redirect to `/auth/auth-error?message=...`. **`src/app/auth/auth-error/page.tsx`** added. Comment: cookie commit via cookieStore merged into `NextResponse.redirect()`.
- **Open redirect:** Callback validates `next` (starts with `/`, not `//`, no `\`).

### Cookie integrity diagnostic

- **`src/app/api/auth/inspect-cookies/route.ts`:** Temporary GET route; reads `await cookies()`, returns **metadata only** (name, present, valueLength, isSupabaseAuth). **No JWT or values.** `sentinelReport`: summary, expectedFlags (Secure, HttpOnly, SameSite, Partitioned), flagMismatches, recommendations, `metadataChecksPass`. Server log: `[Sentinel] Cookie integrity check` (counts/names only).
- **`docs/COOKIE_INTEGRITY_AUDIT.md`:** PKCE handshake and redirect commit behavior; middleware explicit cookie response; Safari/third-party cookie note; how to verify flags in DevTools.

---

## Boutique mobile & MAL audit (2025-03)

### Viewport & browser bar (svh)

- **Layouts:** Replaced `min-h-screen` / `100vh` with `min-h-svh` (small viewport height) in `layout.tsx`, `AssessmentFlow.tsx`, `DashboardView.tsx`, `onboarding/page.tsx`, `not-found.tsx`, and `globals.css` (body) so the mobile browser address bar does not overlap primary actions.
- **Practice:** `PracticeCapture` and practice page use `min-h-svh` and `pb-safe` / `pt-safe` for consistent viewport behavior.

### Safe areas (notch & home indicator)

- **Utilities:** Added `.pt-safe` and `.pb-safe` in `globals.css` using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **PracticeCapture:** Root uses `pb-safe pt-safe`; controls strip uses `pb-safe` and `mt-auto` so Start/Stop sit in the lower third above the home indicator.
- **Practice page:** "Back to library" has a 44×44 touch target and safe-area padding so it stays clear of the notch.
- **Dashboard:** Main uses `pt-safe pb-safe`; content uses `pb-[max(6rem,env(safe-area-inset-bottom))]`. **WelcomeKit:** `pt-safe` and bottom padding with safe-area for modal and CTA.

### Touch ergonomics (44×44 & thumb zone)

- **Button:** All buttons get `min-h-[44px] min-w-[44px]` and `tap-scale` in `button.tsx`.
- **AssessmentFlow:** All primary actions (Start my journey, Continue, Back, Start 30s capture) and Toggle have 44px+ hit areas and `touch-manipulation`.
- **Dashboard:** "Practice now", recent session links, and continue-learning cards use 44px minimum and `tap-scale`.
- **Practice controls:** Start/Stop block is in the lower third via `mt-auto` and safe-area padding.

### Hardware acceleration & reduced Bloom

- **PracticeCapture:** Refining overlay and Bloom/sparkle use `will-change: transform` and `translateZ(0)`. **BloomSparkle** component: particle count 2 when `prefers-reduced-motion: reduce`, 6 otherwise.
- **WelcomeKit & AssessmentFlow:** Motion/Bloom elements use GPU-friendly styles. **Toggle** thumb uses `will-change` / `translateZ(0)`.

### iOS Safari video

- **PracticeCapture, AssessmentFlow, PracticePlayer:** Teacher and webcam `<video>` elements get `webkit-playsinline` and `playsinline` set in `useEffect` for older iOS; all use `playsInline` and `muted` to prevent full-screen native player.

### Tactile feel (native-app style)

- **globals.css:** New `.tap-scale` utility: `transform: translateZ(0)`, `will-change: transform`, and `:active { transform: scale(0.97) }`.
- **Button:** All variants use `tap-scale`. Practice "Back to library" and dashboard/assessment links use `tap-scale` where appropriate.

### Model-Assisted Labeling (MAL) audit & Admin Verification UI

- **`docs/MAL_AUDIT_2026.md`:** Full audit of MAL and Automated Labeling Pipeline: DTW/ST-GCN/Pattern Library/CoMPAS/SalsaAgent, runAutoLabel/suggested_labels/segmentation, Proposed vs Verified, one-click vs swipe, zero-shot/VLM, similarity thresholds (0.55, 0.85, 0.7, 0.6), and code gaps. **MAL Readiness Score: ~62%.**
- **`AdminVerificationTinder.tsx`:** Boilerplate for "Tinder for Labels" admin UI: unified **AI_PROPOSAL** type, `suggestedLabelToProposal` / `suggestedSegmentToProposal`, card-based Approve/Reject with optional high-confidence (≥0.85) badge. Exported from `src/features/admin/index.ts`.

---

## Supply-to-Practice, Privacy & Founding Member (2025-03)

### Supply-to-Practice bridge

- **Creator upload → extraction**: `AdminUpload.tsx` inserts new `dance_library` rows with `status: "pending_analysis"`, then fires `POST /api/process-dance-video` with `rowId` so motion_dna is populated automatically. `uploaded_by` set for GDPR erasure.
- **Gold Standard in registry**: `saveMoveToRegistry` (registry-actions) stores biomechanical curves as Gold Standard; docstring updated. `get-curve-delta-tips.ts` compares student curves to registry and returns dance-literate tips for CoachingCard.
- **PracticeCapture**: After comparison, calls `getCurveDeltaTips(videoId, frames)` and merges curve-delta tips with joint/timing tips; anonymizes pose data (strip face landmarks) before saving to `practice_sessions`.
- **Dashboard**: Fetches `session_name` and shows "Recent sessions" with Creative Director names; `recentSessions` passed to DashboardView.

### Practice-to-Coaching refinements

- **CoachingCard**: Accepts optional `comparisonResult` (harmonyScore, worstJointGroup). Boutique tip mapping by joint group (Hips/Feet/Frame); dynamic accent (Rose Gold ≥80%, muted Champagne &lt;60%); staggered Framer Motion entrance for bullets. PracticeCapture passes `comparisonResult` from worker result.
- **AssessmentFlow step 5**: Glassmorphic persona card with Bloom animation; First Move suggestion from `getFirstMoveForLevel(level)`; link to Encyclopedia.
- **Mobile**: Practice page and PracticeCapture use `min-h-[100svh]`, safe-area insets, 44px+ touch targets, pulse on Record button; SessionNamePicker pills 44px.

### Privacy Gate & GDPR

- **Migrations**: `profiles` (privacy_consent_granted, has_seen_welcome_kit, has_completed_assessment); `dance_library.uploaded_by`; RLS for practice_sessions DELETE, dance_library DELETE (own uploads), move_registry INSERT/UPDATE/DELETE (admin/teacher only).
- **deleteUserBiometricData** (privacy-actions): Cascading hard delete of user's practice_sessions and dance_library where uploaded_by = uid. Session verified via getUser(); RLS scoped. Gold Standards never deleted.
- **exportUserData**: Returns practice_sessions metadata (scores, dates) as JSON for data portability.
- **Anonymization**: `anonymizePoseData()` strips MediaPipe face landmarks (0–10) before saving student_motion_data.
- **Consent**: `getPrivacyConsentGranted` / `grantPrivacyConsent`; PrivacyConsentModal in PracticeCapture and AssessmentFlow; camera/MediaPipe only after consent.
- **updatePracticeSessionName**: Guardian – update scoped to auth.uid() (user_id). useOptimistic in PracticeCapture for instant UI.

### Danger Zone & Right to be Forgotten

- **SettingsView**: Danger Zone with "Request my data export" (downloads JSON) and "Delete my account & biometric data". Multi-step confirmation modal (Step 1: warning; Step 2: final "Permanently delete"). Privacy Policy link and copy: "Face data is never stored, and motion data is yours to control."
- **On successful delete**: Toast "Your data has been gracefully erased…", then signOut and redirect to `/`. Sonner Toaster added in root layout.
- **`/privacy`**: Placeholder Privacy Policy page.

### Extraction API (process-dance-video)

- **Auth**: Only admin or teacher (`app_metadata.role`) can trigger; 403 otherwise.
- **Env**: EXTRACTION_SERVICE_URL, EXTRACTION_API_KEY (optional header), SUPABASE_SERVICE_ROLE_KEY for DB update.
- **Timeout/retry**: 90s timeout, 2 retries with 3s delay for cold start.
- **DB update**: Service Role client (`createServiceRoleClient` in lib/supabase/admin.ts) updates dance_library (motion_dna, status: needs_labeling). Supply chain logging: Sent to AI, AI Processing, Data Saved.

### Welcome Kit & Post-Assessment Upsell

- **WelcomeKit** (onboarding): Glassmorphic 3-slide overlay (Vision, How it works, Privacy Pact). Shown on first dashboard visit unless admin/teacher or has_seen_welcome_kit. "Begin Initial Assessment" calls completeWelcomeKit() (consent + has_seen_welcome_kit) and navigates to /onboarding.
- **AssessmentFlow step 5**: Founding Member upsell card – "Limited Founding Spots Available" badge; aspirational copy; primary CTA "Claim Founding Member Access ✨" → NEXT_PUBLIC_PURCHASE_URL or /pricing; secondary "Continue with 3 free practices" → setAssessmentCompleted(), then dashboard. Social proof: "Join 50+ other dancers in our founding cohort."
- **`/pricing`**: Placeholder for purchase URL.

### Auth & middleware

- **middleware**: getSession() + getUser() to refresh Supabase session and reduce auth desync.

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
