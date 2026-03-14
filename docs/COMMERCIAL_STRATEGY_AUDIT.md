# Commercial Strategy Audit

**Role:** Product Manager & Senior Business Analyst  
**Objective:** Align technical debt and feature readiness with Commercial Strategy (Founding Member Sales, Creator Marketplace, Freemium Growth).

---

## 1. Value-Creation Audit

### High-Value (Retention / Revenue)

| Feature                                               | Location                                                                     | Rationale                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Practice + comparison + coaching**                  | PracticeCapture, comparison-engine, generate-coaching-feedback, CoachingCard | Core loop: practice → score → AI tips. Directly drives engagement and “premium” perception.       |
| **Library (genre-scoped)**                            | StudentLibraryView, useDanceLibrary, Salsa/Bachata mode                      | Discovery of teacher content; prerequisite for practice and for Creator Marketplace supply.       |
| **Move Registry + Dictionary Lab “Save to Registry”** | registry-actions, DictionaryLab                                              | Creator pipeline: teachers/studios add Gold Standard moves. Enables Marketplace and “Move Packs.” |
| **Session naming (Creative Director)**                | naming-engine, generate-session-names, SessionNamePicker                     | Differentiator and “boutique” feel; supports premium positioning.                                 |
| **Dashboard + Bloom**                                 | DashboardView, practice_sessions                                             | Retention: progress, weekly goal, “Continue learning.”                                            |
| **Onboarding assessment**                             | AssessmentFlow, getAssessmentLevel                                           | First-run value and segmentation (Seedling/Blossom/Performer); funnel for paid.                   |
| **Admin label + Scanner**                             | label-actions, VideoLabeler, runAutoLabel                                    | Enables Creator supply (segment videos, suggest labels); needed for Marketplace content.          |

### Low-Value / Technical Vanity

| Feature                                                       | Location                        | Rationale                                                            |
| ------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| **Demo page**                                                 | /demo                           | Overview only; no direct retention or revenue.                       |
| **Move Registry “Source” filter (CoMPAS3D vs User)**          | Admin registry view             | Niche for power users; not required for Monday MVP or first revenue. |
| **Recharts in Dictionary Lab (hip-tilt/foot-velocity chart)** | DictionaryLab                   | Useful for creators but not student-facing; can be Phase 2.          |
| **Splash screen / “preparing your studio”**                   | SplashWrapper, SplashScreen     | Polish; low impact on conversion if load is already acceptable.      |
| **Candidate-move-job / scout**                                | candidate-move-job.ts, scout.ts | “Pending Move” suggestions; useful for scale but not blocking MVP.   |

---

## 2. Gap Analysis: Functional vs Market-Ready

| Area                                      | Functional? | Market-Ready? | Gap                                                                                                             |
| ----------------------------------------- | ----------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| **Practice flow**                         | Yes         | Partial       | No Stripe gate; no “Founding Member” or tier. Session naming and coaching feel premium but are free.            |
| **Library**                               | Yes         | Yes           | Genre mode (Salsa/Bachata) and filters are in place.                                                            |
| **Creator: Save to Registry**             | Yes         | Yes           | Dictionary Lab → registry-actions → move_registry with curves.                                                  |
| **Creator: motion_dna supply**            | No          | No            | No in-repo extraction; Edge Function placeholder. Registry can’t be populated at scale without pipeline.        |
| **Admin label + Scanner**                 | Yes         | Partial       | Scanner needs move_registry rows with curves; chicken-and-egg until extraction + Save to Registry are used.     |
| **Onboarding “First Dance”**              | Yes         | Partial       | Consent and 30s capture exist; no clear CTA to paid or “Founding Member” after level.                           |
| **Payments / Move Packs / Revenue share** | No          | No            | No Stripe, no credits/XP, no “Move Pack” product, no teacher revenue share.                                     |
| **BPM**                                   | Stored      | Partial       | BPM saved on upload and shown in Library/Dashboard/Dictionary Lab; label page header does not show BPM (minor). |

---

## 3. Revenue Logic: Stripe & Credits/XP

**Current state:**

- **Stripe:** Not integrated. No `stripe` (or similar) in `package.json` or `src`. No checkout, subscriptions, or one-time payments.
- **Credits / XP:** No credit balance, XP, or gamification currency in the codebase. No tables or types for “Move Pack” entitlements or teacher payouts.
- **Infrastructure for Move Packs:** Missing. Would require: product/sku model, entitlement checks (e.g. “has access to Pack X”), and gating of practice content or features by entitlement.
- **Revenue sharing for teachers:** No creator earnings, payout, or revenue-share logic. Would require: attribution (video/move → creator), revenue events, and payout rules.

**Conclusion:** Revenue infrastructure is **not** ready for Move Pack purchases or teacher revenue sharing. Both are Expansion Phase work.

---

## 4. Lead Architect: Orphaned Math & Creator Marketplace

**“Orphaned math” and Move Registry population:**

- **signature-calculator.ts:** The **curve-based** path is wired: `computeMoveSignature` → hipTiltCurve, footVelocityCurve, kneeFlexionCurve. Used by Dictionary Lab (display + Save to Registry), label-actions (Scanner), and candidate-move-job. There is **no** `generateMoveSignature` in the current codebase (per grep); the audit doc’s “orphan” referred to a range-based profile that was never used. The **real** blocker for populating the Creator Marketplace is **not** orphaned math but **motion_dna supply**.
- **Move Registry population blockers:**
  1. **motion_dna:** Filled only by an external extraction pipeline (or future Edge Function). No in-repo pipeline writes `dance_library.motion_dna`. Without it, Dictionary Lab has no curves to “Save to Registry” and the Scanner has no teacher curves to match.
  2. **Chicken-and-egg:** Scanner needs approved move_registry rows with `biomechanical_profile` (curves). Those come from “Save to Registry” (Dictionary Lab) or from CoMPAS3D/script import. So either: (a) manual curation via Dictionary Lab after extraction is run elsewhere, or (b) implement extraction (e.g. process-dance-video + service) and then encourage Save to Registry.

**Recommendation:** Treat “orphaned math” as closed (curve path is the single source of truth). Document and prioritize **motion_dna extraction** and **process-dance-video** implementation as the enabler for Creator Marketplace and Move Packs.

---

## 5. UX Strategist: PracticeCapture & AssessmentFlow

**PracticeCapture – “Boutique” enough for premium?**

- **Strengths:** CoachingCard (score + pro tips), SessionNamePicker (rose-gold pills, “Roll the Dice”), comparison worker, genre/BPM for naming. Copy and visual tone (champagne/rose) support a premium feel.
- **Gaps:** No paywall or “Founding Member” badge; no explicit differentiator (e.g. “AI Voice Coaching” or “Social Duets”) reserved for paid. Post-save flow (name picker → coaching) is good but not yet positioned as a premium benefit.
- **Friction-to-value:** Camera permission and “Start practice” are clear. “Refining your signature” overlay and delay may feel long on slow devices; consider a progress message or skip for returning users.

**AssessmentFlow – “First Dance” friction-to-value:**

- **Strengths:** 5-step flow, consent (biometric + data), 30s capture, level (Seedling/Blossom/Performer), “Open my Studio Dashboard” CTA. Copy (“Every dancer has a unique signature”) is on-brand.
- **Gaps:** No post-assessment upsell (e.g. “Unlock Move Packs as a Founding Member”). Level is shown but not tied to a product (e.g. recommended pack or tier). 30s can feel long; optional shorter “quick assessment” could reduce drop-off.
- **Recommendation:** Add a single post-step-5 CTA: “Become a Founding Member” or “Unlock Salsa Essentials Pack,” even if the destination is a waitlist or coming-soon page, to test intent and capture leads.

---

## 6. Privacy Officer: Biometric Anonymization & GDPR

**Current implementation:**

- **Consent:** AssessmentFlow has explicit toggles: “Biometric data (pose) for analysis” and “Store my progress in my account.” Biometric consent is **required** to continue (button disabled until checked). No pose data is collected without this step in onboarding.
- **Copy:** “Dance DNA” is described as “anonymized and stays in your private vault.” This implies: (1) data is not used to identify the person, (2) storage is user-scoped (private vault).
- **Storage:** Pose data lives in `dance_library.motion_dna` (teacher reference) and `practice_sessions.student_motion_data` (student). RLS and auth ensure users see only their own sessions; teacher content is app-level.
- **Gaps for a strict GDPR / B2B audit:**
  1. **Legal basis:** Consent is collected but there is no explicit “Legal basis” (e.g. “Consent” or “Contract”) in UI or in a privacy policy link in the flow.
  2. **Retention:** No stated retention for biometric data (e.g. “deleted after 90 days” or “until account deletion”). For B2B, corporates often require defined retention and DPA language.
  3. **Anonymization definition:** “Anonymized” is used in copy; technically pose is pseudonymized (linked to user/session). True anonymization would require stripping all linkage; current design is “processing for analysis under consent” with user-scoped storage.
  4. **Data export / erasure:** No in-app “Export my data” or “Delete my biometric data” flow. Required for GDPR (Art. 15, 17) and for enterprise DPAs.
  5. **Privacy policy / DPA:** No reference in the audit to an in-app policy or B2B DPA; assume they exist or are planned.

**Conclusion:** Consent and “private vault” messaging are a good base. For a **corporate B2B studio partner**, add: retention policy, export/erasure flows, and DPA-ready language. For **GDPR audit**, add explicit legal basis and a link to privacy policy in the consent step.

---

## 7. Modular Strategist: Feature Flags & Tiered Upsells

**Current flags (`src/lib/flags.ts`):**

- `AUDIO_COACH` = `NEXT_PUBLIC_AUDIO_COACH === "true"`
- `PARTNER_MODE` = `NEXT_PUBLIC_PARTNER_MODE === "true"`

**Usage:** These are **not** referenced in the codebase (except in `flags.ts`). No UI toggles, no gating of “AI Voice Coaching” or “Social Duets” by tier.

**Recommendation:**

- **Use flags for tiered upsells:** Gate high-value features behind flags and, in parallel, behind a “tier” or “entitlement” (once Stripe/entitlements exist):
  - **AI Voice Coaching:** When `AUDIO_COACH` is true and user has entitlement (e.g. Founding Member or Premium), show voice feedback; otherwise show “Upgrade to unlock voice coaching.”
  - **Social Duets / Partner Mode:** When `PARTNER_MODE` is true and user has entitlement, show partner/social features; otherwise show “Coming soon for members.”
- **Implementation:** Keep env-based flags for global kill switches; add a **user-level** source (e.g. `user.tier` or `entitlements` from DB) so that “AI Voice Coaching” and “Social Duets” can be toggled per tier without code deploy. Then in UI: `const canUseVoice = AUDIO_COACH && (user?.tier === 'premium' || ...)`.

---

## 8. Prioritized Feature Backlog

### Must-Have for Monday (Launch / Founding Member)

| #   | Item                                                         | Owner     | Notes                                                                                                                                                                                            |
| --- | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Stripe integration (checkout + subscription or one-time)** | Backend   | Founding Member or “Pro” tier; gate at least one clear benefit (e.g. more practice saves, or first “Move Pack”).                                                                                 |
| 2   | **Post-onboarding CTA**                                      | UX        | One “Founding Member” or “Unlock Move Pack” CTA after assessment to capture intent.                                                                                                              |
| 3   | **BPM on label page**                                        | Dev       | Add BPM to label header/video metadata for consistency and creator UX.                                                                                                                           |
| 4   | **Privacy: retention + export/erasure**                      | Legal/Dev | Define retention for biometric data; add “Export my data” and “Delete my data” (or link to Supabase/auth flow).                                                                                  |
| 5   | **motion_dna extraction path**                               | Lead Arch | Implement or document one path: e.g. process-dance-video Edge Function calling extraction service and writing `motion_dna`, so Dictionary Lab and Save to Registry can populate the Marketplace. |

### Expansion Phase (Marketplace / Social)

| #   | Item                                     | Notes                                                                                       |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | **Move Packs (product + entitlement)**   | Product catalog, purchase flow, entitlement checks, gating of practice content or features. |
| 2   | **Revenue sharing for teachers**         | Creator attribution, revenue events, payout rules and UI.                                   |
| 3   | **AI Voice Coaching (tiered)**           | Implement feature; gate with `AUDIO_COACH` + user tier.                                     |
| 4   | **Social Duets / Partner Mode (tiered)** | Implement feature; gate with `PARTNER_MODE` + user tier.                                    |
| 5   | **Credits / XP**                         | If needed for engagement or unlocks; design and implement.                                  |

---

## 9. Value-at-Risk Report (Incomplete Features Leaking Trust)

| Risk                            | Feature / Area                                         | Impact                                                      | Mitigation                                                                                                                        |
| ------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **“Where’s my BPM?”**           | BPM not shown on admin label page                      | Creators may think BPM wasn’t saved.                        | Show BPM in label header/video metadata (quick fix).                                                                              |
| **Slow or opaque analysis**     | Practice “Refining your signature” + comparison worker | Users may think the app is stuck.                           | Progress text or step indicator; consider timeout and fallback message.                                                           |
| **Scanner “no results”**        | Empty move_registry or missing curves                  | “Run auto label” returns no suggestions; admins lose trust. | Document: “Add Gold Standard moves via Dictionary Lab → Save to Registry” and ensure extraction pipeline exists or is documented. |
| **No way to delete my data**    | Missing export/erasure                                 | GDPR and B2B concern.                                       | Add export/delete flows or link to account settings and document retention.                                                       |
| **Consent without policy link** | AssessmentFlow consent step                            | Legal risk.                                                 | Add “Privacy policy” link next to consent toggles.                                                                                |

---

## 10. The Kill List (Remove or Defer)

| #   | Feature / Code Path                                       | Recommendation       | Rationale                                                                                                                                                                           |
| --- | --------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Demo page (`/demo`)**                                   | **Defer or remove.** | Informational only; does not drive sign-up or revenue. Can be replaced by a single “See how it works” section on the home or pricing page. Frees focus for Practice and Onboarding. |
| 2   | **Move Registry “Source” filter (CoMPAS3D vs User)**      | **Defer.**           | Valuable for power users and ops but not for Monday MVP or first revenue. Hide or remove from admin nav until Marketplace and multiple sources are live.                            |
| 3   | **Candidate-move-job / scout (Pending Move suggestions)** | **Defer.**           | Improves scale and discovery of new moves but is not required for “Save to Registry” or first Move Packs. Defer until Creator Marketplace and curation workflows are prioritized.   |

---

## Summary Table

| Theme                                                  | Status                                                | Priority                                                 |
| ------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| **Revenue (Stripe, Move Packs, Revenue share)**        | Not implemented                                       | Must-Have (Stripe + CTA); Expansion (Packs, share).      |
| **Creator Marketplace (motion_dna, Save to Registry)** | Registry path wired; extraction missing               | Must-Have: extraction path. Expansion: full Marketplace. |
| **Practice + Coaching**                                | Functional; not gated                                 | Must-Have: add paywall/CTA.                              |
| **Onboarding “First Dance”**                           | Functional; no upsell                                 | Must-Have: post-step CTA.                                |
| **Feature flags (Voice, Social)**                      | Defined, unused                                       | Expansion: wire to tiers and features.                   |
| **Privacy / GDPR**                                     | Consent present; retention and export/erasure missing | Must-Have: retention + export/erasure + policy link.     |
| **BPM display**                                        | Partial (missing on label page)                       | Must-Have: small fix.                                    |
| **Kill List**                                          | Demo, Source filter, Scout                            | Defer to focus on core revenue and Creator supply.       |
