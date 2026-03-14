# Onboarding and Dashboard – Verification and Prerequisites

## Summary

| Flow           | Auth required? | Prerequisites                                                               |
| -------------- | -------------- | --------------------------------------------------------------------------- |
| **Onboarding** | No             | None. Optional: Basic Step video URL for 30s capture.                       |
| **Dashboard**  | **Yes**        | User must be signed in (Supabase Auth). Login page now supports magic link. |

---

## Onboarding (`/onboarding`)

- **Available to everyone** – no login required.
- **Flow**: Welcome → Studio agreement (consent toggles) → 30s webcam capture (follow teacher or synthetic motion) → comparison engine → result screen (“You have a natural X’s grace”, harmony score) → **“Open my Studio Dashboard”** → navigates to `/dashboard`.
- **Data**: All in-memory during the flow. Nothing is written to the database. No `user_id` or `practice_sessions` involved.
- **Prerequisite**: None. Optional: `basicStepVideoUrl` (and optionally `teacherMotion`) can be passed to `AssessmentFlow` from a page that fetches a default video; the onboarding page currently uses synthetic teacher motion if no props are provided.

**Note:** If the user is **not** signed in and clicks “Open my Studio Dashboard”, they are redirected to **/login** (because the dashboard page requires auth). So the intended path is: complete onboarding → sign in (if not already) → dashboard.

---

## Dashboard (`/dashboard`)

- **Requires login.** The dashboard page calls `supabase.auth.getUser()`. If there is no user, it redirects to **/login**.
- **Data it uses**:
  - **practice_sessions** – last 7 days of sessions for `user_id` (for chart and “Continue learning”).
  - **dance_library** – published videos for “Continue learning” (by recent video ids).
  - **move_registry** – approved moves for “Move of the day”.
- **Prerequisites**:
  1. **User is signed in** – achieved via `/login` (magic link) or any Supabase Auth method you add.
  2. **Supabase**: Redirect URLs must include your app origin (e.g. `https://yourapp.vercel.app/auth/callback`) in Authentication → URL Configuration.
  3. **Tables**: `practice_sessions`, `dance_library`, `move_registry` must exist (migrations). Dashboard works with zero sessions (shows “No sessions yet” and empty chart).

---

## Login (prerequisite for Dashboard)

- **Route**: `/login`.
- **Implementation**: Magic link (Supabase `signInWithOtp`). User enters email → “Send magic link” → receives email → clicks link → `/auth/callback` exchanges code for session → redirect to `?next=` (default `/dashboard`).
- **Config**: Set `NEXT_PUBLIC_APP_URL` in production (e.g. `https://dancemania.vercel.app`) so the magic link points to the correct origin. Vercel can set this automatically; otherwise the app falls back to `https://${VERCEL_URL}` or `http://localhost:3000`.

---

## Middleware and route protection

- **Middleware** (`src/middleware.ts`) only refreshes the Supabase session (`updateSession`). It does **not** redirect unauthenticated users. So routes are **not** globally protected.
- **Dashboard** is protected at the **page** level: server component checks `getUser()` and redirects to `/login` if no user.
- **Onboarding** has no auth check; it is public.

---

## Test user flow (recommended)

1. Open **/onboarding** → complete consent and 30s capture → see result.
2. Click **“Open my Studio Dashboard”** → if not logged in, you are sent to **/login**.
3. On **/login** enter email → “Send magic link” → check email → click link → land on **/dashboard**.
4. **Dashboard** shows chart (empty if no sessions), “Continue learning”, “Move of the day”. After doing **Practice** while signed in, sessions appear on the dashboard.
