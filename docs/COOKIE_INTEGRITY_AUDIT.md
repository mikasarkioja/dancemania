# Sentinel: Cookie Integrity Audit

**Role:** Auth & Identity Specialist  
**Purpose:** Verify Supabase/Next.js 15 auth cookies and PKCE handshake; no JWT or secrets exposed.

---

## 1. Diagnostic Route

**Path:** `src/app/api/auth/inspect-cookies/route.ts` (temporary)

- **Action:** GET returns a JSON summary of cookie **metadata only**.
- **Reads:** `await cookies()` then `getAll()`.
- **Returns:** For each cookie: `name`, `present`, `valueLength`, `isSupabaseAuth`. **Never returns `value` or any JWT.**
- **Use:** Call from a logged-in session (e.g. `GET /api/auth/inspect-cookies`) and confirm `sb-*` cookies are present and non-empty. Use browser DevTools to verify flags.

---

## 2. Security Flag Check (Supabase Auth Cookies)

**Expected cookie names:** `sb-<project-ref>-auth-token` (and optionally chunked / code-verifier variants).

**Flags we cannot read from the server:** Browsers do not send `Secure`, `HttpOnly`, `SameSite`, or `Partitioned` back to the server. They are set by the server and stored by the browser.

**Verify in browser:** DevTools → Application → Cookies → select your site.

| Flag            | Expected / recommendation                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Secure**      | `true` in production (HTTPS only).                                                                                  |
| **HttpOnly**    | `true` to reduce XSS-based token theft. Supabase SSR may set this per cookie; confirm in DevTools.                  |
| **SameSite**    | `Lax` or `Strict` to reduce CSRF. Avoid `None` unless you need cross-site.                                          |
| **Partitioned** | Optional; use if you need cross-site behavior (e.g. Safari embedded) and are planning a first-party proxy or CHIPS. |

**Sentinel check:** The diagnostic route does **not** expose raw JWTs. It only reports presence and length. Any mismatch between “expected” and “actual” flags must be checked in DevTools or by reviewing the code that sets cookies (`@supabase/ssr` and our `setAll` usage).

---

## 3. PKCE Handshake and Redirect

**Callback:** `src/app/auth/callback/route.ts`

- Uses `createClient()` from `@/lib/supabase/server`, which uses `await cookies()` and passes `cookieStore` to Supabase’s `setAll`.
- `exchangeCodeForSession(code)` causes Supabase to call `setAll` with new session cookies (names, values, **options** including Secure/HttpOnly/SameSite).
- Our server’s `setAll` does `cookieStore.set(name, value, options)` for each cookie.

**Commit to browser:** In the Next.js App Router, cookies set via `cookies().set()` (or the store returned by `cookies()`) are merged into the **response** that the Route Handler returns. So when we `return NextResponse.redirect(...)`, that redirect response is the one that should receive the `Set-Cookie` headers from the cookie store. If cookies do not persist after redirect in your environment, verify:

1. The handler returns a single `NextResponse.redirect()` after `exchangeCodeForSession`.
2. No other code overwrites or clears the response before return.
3. In production, the domain and path of the cookies match the site (same origin).

**Middleware:** `src/lib/supabase/middleware.ts` builds **one** response object (`supabaseResponse = NextResponse.next({ request })`) and passes it to Supabase via `setAll(cookiesToSet) => supabaseResponse.cookies.set(...)`. So middleware **explicitly** writes cookies onto the response it returns. No ambiguity.

**Recommendation:** After login, open DevTools → Network → select the callback request → check Response Headers for `Set-Cookie`. Confirm all `sb-*` cookies are present and that the next request to your app includes those cookies.

---

## 4. Cross-Platform / Safari and Third-Party Cookies

- **Safari (ITP):** If your app is on `app.example.com` and Supabase is on `supabase.co` (or another domain), cookies set by the auth redirect might be treated as third-party and blocked or limited by Safari.
- **Mitigation:** Prefer same-site auth (Supabase project URL on same root domain as the app, or use a first-party proxy so cookies are set on your domain). If you must be cross-site, review Supabase’s guidance and the Storage Access API if you need embedded or cross-origin flows.
- **Diagnostic:** Compare behavior in Chrome vs Safari on iOS after magic-link login. Use `/api/auth/inspect-cookies` and DevTools to see whether `sb-*` cookies are present and sent on subsequent requests.

---

## 5. Sentinel Report (from the diagnostic route)

The `GET /api/auth/inspect-cookies` response includes a `sentinelReport` object:

- **summary:** Counts of cookies, Supabase auth cookie names, whether they are present and non-empty.
- **securityFlagsNote:** Explains that flags are not readable from the request.
- **expectedFlags:** Short text for Secure, HttpOnly, SameSite, Partitioned.
- **flagMismatches:** Array of issues the server can infer (e.g. no auth cookies, empty auth cookie value).
- **recommendations:** e.g. “Confirm in DevTools that each sb-\* cookie has Secure=true, HttpOnly=true, SameSite=Lax or Strict.”

**Constraint:** The route and this audit do **not** log or expose raw JWT strings; only metadata and security expectations for the transport layer.

---

## 6. Clean Up

- The route at `src/app/api/auth/inspect-cookies/route.ts` is intended as a **temporary** diagnostic. Remove or restrict it (e.g. to development or internal IPs) before production if you do not want a public cookie-metadata endpoint.
- Optional: Add a simple check in CI or a pre-release script that hits the endpoint and asserts `supabaseAuthCookieCount >= 1` when run in a signed-in context, to catch regressions.
