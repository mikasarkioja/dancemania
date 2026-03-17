# MVP Gap Analysis — Monday Launch Readiness

**Role:** Product Manager & Lead Architect  
**Baseline:** COMMERCIAL_STRATEGY_AUDIT.md  
**Objective:** Completeness dashboard for Monday MVP vs current repository.

---

## 1. Revenue Engine (Stripe & Gating)

| Item                        | Status     | Notes                                                                                                                   |
| --------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Stripe checkout flow        | ❌ Missing | No `src/features/subscription`, no Stripe in `package.json` or `src`. No checkout, subscriptions, or one-time payments. |
| 3-free-practices gatekeeper | ❌ Missing | No logic for "free practice limit," practice count, or gate preventing non-paid users from unlimited AI analysis.       |

**Quick-Fix (Stripe):** Complexity **4** — New feature. Target: new `src/features/subscription/` (or `src/app/(marketing)/pricing/`), Stripe SDK, webhook route, env vars.  
**Quick-Fix (3-free gate):** Complexity **2** — Target: `src/features/practice/components/PracticeCapture.tsx` (or a wrapper) + server action or middleware to check `practice_sessions` count / entitlement before running comparison; show upgrade CTA when over limit.

---

## 2. Creator Supply Chain (Extraction & Registry)

| Item                                            | Status                          | Notes                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| process-dance-video API (extraction bridge)     | ⚠️ Functional but env-dependent | `src/app/api/process-dance-video/route.ts`: Full handler (body parse, fetch Python service, validate PoseData, durationMs, update dance_library motion_dna + status needs_labeling, boutique error handling). **When `EXTRACTION_SERVICE_URL` is unset** returns 503 with clear message. Not a TODO/placeholder; depends on external service. |
| saveMoveToRegistry (BiomechanicalProfile in DB) | ✅ Launch Ready                 | `src/features/admin/actions/registry-actions.ts`: Fetches motion_dna, slices by start/end, `computeMoveSignature`, `validateBiomechanicalProfile`, inserts move_registry with biomechanical_profile (hip_tilt_curve, foot_velocity_curve, knee_flexion_curve) and genre. RegistryForm + DictionaryLab wired.                                  |

**Quick-Fix (extraction without Python):** Complexity **5** — Requires implementing or wiring a real extraction service; route is ready.

---

## 3. Student Core Loop (Assessment & Coaching)

| Item                            | Status                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AssessmentFlow level assignment | ✅ Launch Ready              | Uses `compareStudentToTeacher` + `getAssessmentLevel`; displays level (Seedling/Blossom/Performer) and Harmony score on step 5.                                                                                                                                                                                                                                                                      |
| Post-Assessment Upsell CTA      | ❌ Missing                   | Step 5 only has "Open my Studio Dashboard". No "Become a Founding Member" or "Unlock Move Packs" CTA.                                                                                                                                                                                                                                                                                                |
| CoachingCard data source        | ⚠️ Functional but Unpolished | Score and metrics/correctionTips come from **real** comparison (studio.worker / comparison-engine). **Pro tips** shown in UI are from `getProTipsForJointGroup(worstJointGroup)` (static copy). LLM-generated feedback is saved to `practice_sessions.metrics.coaching_feedback` via `generateAndSaveCoachingFeedback` but **not** returned to client or displayed in CoachingCard in the same flow. |

**Quick-Fix (Post-Assessment Upsell):** Complexity **1** — Target: `src/features/onboarding/components/AssessmentFlow.tsx` step 5. Add a secondary button or link (e.g. "Become a Founding Member" → `/pricing` or waitlist).  
**Quick-Fix (CoachingCard AI tips in UI):** Complexity **2** — Target: `PracticeCapture.tsx` — have `generateAndSaveCoachingFeedback` return the feedback (it already returns `CoachingFeedback`); use returned `proTips` in `setLastCoachingResult` when showing CoachingCard so AI tips are shown instead of or in addition to static tips.

---

## 4. Governance & Trust (GDPR & Auth)

| Item                           | Status          | Notes                                                                                                                                                                                |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delete My Data / Erasure       | ❌ Missing      | No API route or server action for account/data erasure. No "Export my data" or "Delete my biometric data" flow found in `src`.                                                       |
| middleware & Auth (Next.js 15) | ✅ Launch Ready | `src/middleware.ts` uses `updateSession` from `@/lib/supabase/middleware`; Supabase SSR `createServerClient` with cookies (getAll/setAll). Standard pattern; no obvious Auth Desync. |

**Quick-Fix (Erasure):** Complexity **3** — Target: New route e.g. `src/app/api/account/export/route.ts` and `src/app/api/account/delete/route.ts` (or auth callback + Supabase user delete); link from settings or privacy page. Requires RLS and policy for user’s own data deletion.

---

## 5. Completeness Dashboard (Summary)

| MVP Area       | Feature                         | Status                                     | Quick-Fix (1–5)      | Target File / Area                                      |
| -------------- | ------------------------------- | ------------------------------------------ | -------------------- | ------------------------------------------------------- |
| **Revenue**    | Stripe checkout                 | ❌ Missing                                 | 4                    | New: subscription/pricing + Stripe SDK                  |
| **Revenue**    | 3-free-practices gate           | ❌ Missing                                 | 2                    | PracticeCapture or auth/session check                   |
| **Creator**    | Extraction API                  | ⚠️ Functional but env-dependent            | 5 (external service) | N/A (route done)                                        |
| **Creator**    | Save to Registry (curves in DB) | ✅ Launch Ready                            | —                    | —                                                       |
| **Student**    | Assessment level                | ✅ Launch Ready                            | —                    | —                                                       |
| **Student**    | Post-Assessment Upsell CTA      | ❌ Missing                                 | 1                    | AssessmentFlow.tsx (step 5)                             |
| **Student**    | CoachingCard real comparison    | ⚠️ Pro tips static, AI saved but not shown | 2                    | PracticeCapture.tsx + generate-coaching-feedback return |
| **Governance** | Delete / Erasure                | ❌ Missing                                 | 3                    | New: account/export, account/delete + UI link           |
| **Governance** | Auth / middleware               | ✅ Launch Ready                            | —                    | —                                                       |

---

## 6. MVP Readiness Percentage

- **Launch Ready (✅):** 4 (Save to Registry, Assessment level, Auth/middleware, extraction route logic when env set).
- **Functional but Unpolished (⚠️):** 2 (Extraction bridge dependency, CoachingCard AI tips not in UI).
- **Broken/Placeholder (🛑):** 0.
- **Missing (❌):** 4 (Stripe, 3-free gate, Post-Assessment Upsell, Delete/Erasure).

**Scoring (equal weight per item):**

- Ready = 100%, Unpolished = 70%, Broken = 30%, Missing = 0%.
- (4×100 + 2×70 + 0×30 + 4×0) / 10 = (400 + 140) / 10 = **54%.**

**MVP Readiness: 54%** — Core creator and student flows (registry, assessment, coaching, auth) are in place; revenue (Stripe + gating) and trust (erasure) are missing; one high-impact, low-effort item is the Post-Assessment Upsell CTA.

---

## 7. Recommended Order for Monday

1. **Post-Assessment Upsell CTA** (Complexity 1) — AssessmentFlow step 5.
2. **3-free-practices gate** (Complexity 2) — Practice count check + upgrade CTA.
3. **CoachingCard show AI tips** (Complexity 2) — Use returned feedback in PracticeCapture.
4. **Delete / Export data** (Complexity 3) — Routes + settings link.
5. **Stripe + checkout** (Complexity 4) — Required for paid launch.
