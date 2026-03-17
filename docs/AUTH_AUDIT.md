# Auth & Identity Audit — Next.js 15 + Supabase

**Role:** The Sentinel (Auth & Identity Specialist)  
**Date:** 2025-03-17  
**Scope:** Middleware sync, client/server creation, server action security, RLS, redirect/callback.

---

## 1. Middleware Sync

**File:** `src/middleware.ts`, `src/lib/supabase/middleware.ts`

### Finding (fixed)

- **Desync risk:** The middleware used `getSession()` then conditionally `getUser()` when a session existed. `getSession()` reads from the cookie only and does **not** validate or refresh the JWT. Expired or near-expiry tokens were not refreshed, so the client could lose auth state (login instability).
- **Fix applied:** Call `await supabase.auth.getUser()` on every request. `getUser()` validates the token with Supabase and refreshes it when needed; `setAll()` writes updated cookies onto the response, so the client stays in sync.

### Response headers

- Cookie updates are applied to `supabaseResponse` (the `NextResponse.next({ request })` instance) via the `setAll` callback. The middleware returns this response, so `Set-Cookie` headers are correctly sent back. **No change needed.**

---

## 2. Client / Server Supabase Creation

**Files:** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

### Server (`server.ts`)

- Uses `createServerClient` from `@supabase/ssr` (correct; not deprecated auth-helpers).
- Uses `await cookies()` from `next/headers` (Next.js 15 async `cookies()`). **Correct.**
- `getAll()` / `setAll()` implemented; `setAll` is wrapped in try/catch for Server Component reads where `cookieStore.set` can throw. **Correct.**

### Client (`client.ts`)

- Uses `createBrowserClient` from `@supabase/ssr`. **Correct.** No `userId` or session passed from client; browser handles cookies.

### Verdict

- No outdated auth-helpers; Next.js 15 cookie usage is correct.

---

## 3. Server Action Security

**Rule:** Every server action must call `await supabase.auth.getUser()` (or equivalent) at the start when it touches user-scoped data. Do not rely on a `userId` (or similar) passed from the client.

### Actions that call `getUser()` (Guardian-compliant)

| Action                       | File                      | Note                                                              |
| ---------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `getPrivacyConsentGranted`   | consent-actions.ts        | ✅                                                                |
| `grantPrivacyConsent`        | consent-actions.ts        | ✅                                                                |
| `deleteUserBiometricData`    | privacy-actions.ts        | ✅                                                                |
| `exportUserData`             | privacy-actions.ts        | ✅                                                                |
| `setAssessmentCompleted`     | assessment-actions.ts     | ✅                                                                |
| `getWelcomeKitStatus`        | welcome-kit-actions.ts    | ✅                                                                |
| `completeWelcomeKit`         | welcome-kit-actions.ts    | ✅                                                                |
| `checkPracticeEntitlement`   | usage-actions.ts          | ✅                                                                |
| `logAnalyticsEvent`          | usage-actions.ts          | ✅                                                                |
| `getSessionCoachingFeedback` | session-actions.ts        | ✅ sessionId from client but query uses `.eq("user_id", user.id)` |
| `updatePracticeSessionName`  | generate-session-names.ts | ✅                                                                |
| `signInWithMagicLink`        | auth/actions.ts           | N/A (no user yet)                                                 |
| `signOut`                    | auth/actions.ts           | N/A                                                               |

### Actions fixed in this audit

| Action                            | File                          | Fix                                                                                                                                           |
| --------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateAndSaveCoachingFeedback` | generate-coaching-feedback.ts | Now calls `getUser()` at start and scopes select/update with `.eq("user_id", user.id)`. Returns `null` if not authenticated or row not owned. |

### Actions that do not call `getUser()` (acceptable or low risk)

| Action                      | File                        | Reason                                                                                                                                                      |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCurveDeltaTips`         | get-curve-delta-tips.ts     | Read-only; uses public `dance_library` and `move_registry`. No user data written. Optional: require auth for audit.                                         |
| `getFirstMoveForLevel`      | get-first-move-for-level.ts | Read-only public `move_registry`. No user data.                                                                                                             |
| `saveMoveToRegistry`        | registry-actions.ts         | RLS restricts INSERT to `app_metadata.role` in ('admin','teacher'). No client `userId`. Optional: explicit `getUser()` + role check for clearer audit.      |
| `runAutoLabel`              | label-actions.ts            | Reads `dance_library`; writes suggested labels on video. Admin flow; RLS on dance_library allows authenticated UPDATE. Optional: restrict to admin/teacher. |
| `promoteProposalToRegistry` | mal-actions.ts              | Admin flow; RLS on move_registry and dance_library enforces role. Optional: explicit `getUser()` + role check.                                              |
| `generateMoveContent`       | generate-move-content.ts    | Read-only move_registry; no user rows.                                                                                                                      |

### Verdict

- No actions were found that trust a **client-passed `userId`** for authorization. The only critical gap was `generateAndSaveCoachingFeedback`, which is now fixed.

---

## 4. RLS Policy Scan

### practice_sessions

- **RLS:** Enabled.
- **Policies:** `practice_sessions_select_own`, `practice_sessions_insert_own`, `practice_sessions_update_own`, `practice_sessions_delete_own` — all use `auth.uid() = user_id`. **Correct.**

### dance_library

- **RLS:** Enabled.
- **Policies:**
  - `dance_library_select`: `USING (true)` — public read. **OK.**
  - `dance_library_delete_own_uploads`: `USING (auth.uid() = uploaded_by)`. **OK.**
  - `dance_library_insert_authenticated` / `dance_library_update_authenticated` (from 20250117000007): `TO authenticated` with `WITH CHECK (true)` / `USING (true)`. **Risk:** Any authenticated user can INSERT/UPDATE any row. Recommend restricting to admin/teacher (e.g. `(auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')`) for production.

### profiles

- **RLS:** Enabled. `profiles_select_own`, `profiles_update_own`, `profiles_insert_own` — all use `auth.uid() = id`. **Correct.**

### move_registry

- **RLS:** Enabled. SELECT public; INSERT/UPDATE/DELETE require `app_metadata.role` in ('admin','teacher'). **Correct.**

### video_moves

- **RLS:** Enabled. Only `video_moves_select` with `USING (true)`. No INSERT/UPDATE/DELETE policies — only service role (or future admin policy) can write. **Acceptable.**

### analytics_events

- **RLS:** Enabled. `analytics_events_insert_own`, `analytics_events_select_own` — `auth.uid() = user_id`. **Correct.**

### Verdict

- **practice_sessions** and **profiles** are correctly restricted by `auth.uid()`.
- **dance_library**: Recommend tightening INSERT/UPDATE to admin/teacher only.

---

## 5. Redirect Loops & Auth Callback

**File:** `src/app/auth/callback/route.ts`

### PKCE flow

- Callback uses `exchangeCodeForSession(code)` — correct for PKCE. No infinite redirect from this route.

### Open redirect (fixed)

- `next` was taken from the query and used in `redirect(origin + next)` without validation. A value like `//evil.com` could lead to open redirect.
- **Fix applied:** Added `isSafeRedirectPath(next)`: must start with `/`, must not start with `//`, must not contain `\`. If invalid, fallback to `"/"`.

### Redirect loop prevention

- If `exchangeCodeForSession` fails, we redirect to `/auth/error?message=Auth failed` (same origin). No loop.
- Magic link is sent with `emailRedirectTo: ${origin}/auth/callback?next=/dashboard`. After success we redirect to `origin + next`. **Safe.**

---

## 6. Critical Fixes Applied (Summary)

1. **Middleware:** Always call `getUser()` (not `getSession()`) so the JWT is validated and refreshed; cookies are written to the response via `setAll`. **Fixes login desync / cookie expiration desync.**
2. **Auth callback:** Validate `next` with `isSafeRedirectPath()` to prevent open redirect.
3. **generateAndSaveCoachingFeedback:** Call `getUser()` at the start; scope select and update with `.eq("user_id", user.id)`; return `null` when not authenticated or row not owned. **Fixes data leakage / integrity risk.**

---

## 7. Recommended Follow-ups

- **dance_library INSERT/UPDATE:** Restrict to admin/teacher in RLS (new migration) so only admins can create/update library rows.
- **Optional:** In `saveMoveToRegistry`, `runAutoLabel`, `promoteProposalToRegistry`, add an explicit `getUser()` and role check for clearer audit and early failure.
- **Optional:** In `getCurveDeltaTips`, require `getUser()` and return empty tips when unauthenticated for consistency.
