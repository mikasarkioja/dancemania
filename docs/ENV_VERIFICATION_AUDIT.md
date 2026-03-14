# Environment Variables – 360° Verification Audit

**Role:** Senior DevOps Engineer & Security Auditor  
**Scope:** DanceAI full-stack (Next.js, Supabase, Python Bridge).  
**Reference:** All `process.env` usage in `src/` and documented Python/env expectations.  
**Note:** `.env.local` is not in the repo; this audit checks code and docs against expected keys. Populate `.env.local` from this checklist.

---

## 1. Variable Existence Check (Keys Found in Codebase)

### Next.js / TypeScript (`process.env` in `src/`)

| Key                             | Where used                                                                          | Required for                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`    | Database, Auth, all Supabase client usage                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same three files                                                                    | Database, Auth (RLS with anon key)                                                   |
| `EXTRACTION_SERVICE_URL`        | `app/api/process-dance-video/route.ts`                                              | Python bridge (pose extraction); optional (503 if unset)                             |
| `OPENAI_API_KEY`                | `app/actions/generate-coaching-feedback.ts`, `app/actions/generate-move-content.ts` | AI coaching tips, AI move descriptions; optional (fallback to Anthropic or defaults) |
| `ANTHROPIC_API_KEY`             | Same two actions                                                                    | Same features; optional (fallback to OpenAI or defaults)                             |
| `NEXT_PUBLIC_APP_URL`           | `lib/auth/actions.ts`                                                               | Magic link redirect origin; optional (fallback below)                                |
| `VERCEL_URL`                    | `lib/auth/actions.ts`                                                               | Fallback when `NEXT_PUBLIC_APP_URL` unset (e.g. Vercel preview)                      |
| `NEXT_PUBLIC_AUDIO_COACH`       | `lib/flags.ts`                                                                      | Feature flag; optional (default false)                                               |
| `NEXT_PUBLIC_PARTNER_MODE`      | `lib/flags.ts`                                                                      | Feature flag; optional (default false)                                               |

### Python Bridge (Documentation Only – No `.py` in Repo)

Docs and READMEs reference these for **scripts** (e.g. `process_pending.py`, extraction service):

| Key                         | Where documented                                    | Purpose                                                                         |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | `scripts/README-auto-label.md`, `docs/CHANGELOG.md` | Python scripts – project URL (same value as Next.js URL)                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Same                                                | Python scripts – service role for server-side DB writes (e.g. suggested_labels) |

**Python and `.env.local`:** Docs say “put them in `.env.local` and load with `python-dotenv`”. If the Python bridge runs in a separate process, it must load `.env.local` explicitly (e.g. `load_dotenv(".env.local")`) or you must export the same vars into the environment before running the script.

---

## 2. Connectivity Status (Green/Red)

| Connection        | Status    | Condition                                                                                                                                                                                   |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**      | 🟢 Green  | If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set and valid. Red if either missing or URL not `https://[project-ref].supabase.co`.                                  |
| **Auth**          | 🟢 Green  | Same as Database (Supabase Auth uses same client). Magic link redirect works if `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` is set correctly.                                                     |
| **Python Bridge** | 🟡 Yellow | **Green** if `EXTRACTION_SERVICE_URL` is set and the service is running and returns PoseData. **Red** if the API route is called and `EXTRACTION_SERVICE_URL` is unset (route returns 503). |

_Actual Green/Red depends on your local or deployed `.env.local` and service availability; the table above is the decision matrix._

---

## 3. Missing Key Alert (Used in Code but Often Omitted from `.env.example`)

`.env.example` in the repo currently contains only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Commented `NEXT_PUBLIC_AUDIO_COACH`, `NEXT_PUBLIC_PARTNER_MODE`

**Variables used in code but not in `.env.example`:**

| Key                      | Used in                                           | Recommendation                                                                              |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `EXTRACTION_SERVICE_URL` | `app/api/process-dance-video/route.ts`            | Add to `.env.example` as optional (e.g. commented) so deployers know the Python bridge URL. |
| `OPENAI_API_KEY`         | generate-coaching-feedback, generate-move-content | Add as optional (commented) in `.env.example`.                                              |
| `ANTHROPIC_API_KEY`      | Same                                              | Same.                                                                                       |
| `NEXT_PUBLIC_APP_URL`    | auth magic link redirect                          | Add as optional for production.                                                             |
| `VERCEL_URL`             | Set by Vercel; no need in `.env.example`.         | —                                                                                           |

---

## 4. Naming Conflict Alert (Python vs `.env.local`)

- **Documentation and scripts** (e.g. `scripts/README-auto-label.md`, `docs/CHANGELOG.md`) use:
  - **`SUPABASE_SERVICE_ROLE_KEY`** (and `SUPABASE_URL`) for the Python Scanner / bridge.
- **Your audit** asked about **`SUPABASE_SERVICE_KEY`**.

**Conflict:** If `.env.local` defines **`SUPABASE_SERVICE_KEY`** (no `_ROLE_`), Python code that reads **`SUPABASE_SERVICE_ROLE_KEY`** will get nothing unless:

- The Python bridge is updated to also check `SUPABASE_SERVICE_KEY`, or
- You standardize on **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.local` and in all docs.

**Recommendation:** Use a single name everywhere. Supabase’s dashboard label is “service_role key”; the usual env name is **`SUPABASE_SERVICE_ROLE_KEY`**. Prefer that in `.env.local` and in Python (e.g. `os.getenv("SUPABASE_SERVICE_ROLE_KEY")`), and document it in SETUP.md. If you must support both, document: “Python accepts either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY` (fallback).”

**Next.js:** The app does **not** use the service role key in `src/`; only the anon key is used. So `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` is only needed for server-side scripts (e.g. Python) or future admin APIs that bypass RLS.

---

## 5. Security Warning (Sensitive Keys with `NEXT_PUBLIC_`)

**Audit result:** ✅ **No sensitive key is prefixed with `NEXT_PUBLIC_` in the codebase.**

- **`NEXT_PUBLIC_SUPABASE_URL`** – Safe; URL is public.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** – Intended to be public; protected by RLS.
- **`NEXT_PUBLIC_APP_URL`** – Safe; public origin.
- **`NEXT_PUBLIC_AUDIO_COACH`**, **`NEXT_PUBLIC_PARTNER_MODE`** – Feature flags; safe.

**Server-only (never exposed to client):** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `EXTRACTION_SERVICE_URL`. They are only read in server code (API route, server actions). ✅

**Important:** Do **not** add `NEXT_PUBLIC_` to the service role key. If you introduce a Supabase service role client in Next.js, keep the key in a variable **without** `NEXT_PUBLIC_` (e.g. `SUPABASE_SERVICE_ROLE_KEY`) and use it only in server-side code.

---

## 6. Value Validation (No Secrets Leaked Here)

- **`NEXT_PUBLIC_SUPABASE_URL`** should follow: `https://[project-ref].supabase.co`. No trailing slash. Validate in your deployment checklist.
- **Service key vs anon key:** The **service_role** key (e.g. `SUPABASE_SERVICE_ROLE_KEY`) is longer and must stay server-only. The **anon** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is the public one. They must be distinct; do not put the service key in any `NEXT_PUBLIC_` var.

---

## 7. Feature Flag Audit (Optional Flags and Defaults)

| Flag         | Env key                    | Default if missing     | Sensible? |
| ------------ | -------------------------- | ---------------------- | --------- |
| Audio coach  | `NEXT_PUBLIC_AUDIO_COACH`  | `false` (`!== "true"`) | ✅ Yes    |
| Partner mode | `NEXT_PUBLIC_PARTNER_MODE` | `false`                | ✅ Yes    |

No code paths assume these are set; both default to `false` when absent from `.env.local`. ✅

---

## 8. Recommended `.env.local` Checklist (Copy-Paste)

Ensure your **uploaded `.env.local`** (or deployment env) contains at least:

```bash
# Required for Next.js (Database + Auth)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional – Magic link redirect (production)
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional – Python extraction bridge (API route calls this)
# EXTRACTION_SERVICE_URL=http://localhost:8000/extract

# Optional – AI (coaching + move descriptions)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Optional – Feature flags
# NEXT_PUBLIC_AUDIO_COACH=true
# NEXT_PUBLIC_PARTNER_MODE=true
```

For **Python scripts** (when you add or run them) use the same project URL and the **service_role** key, and keep the name consistent:

```bash
# For Python / scripts (do NOT use NEXT_PUBLIC_ for service key)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role secret, not anon
```

---

## 9. Summary Table

| Item                                   | Result                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Connectivity – Database**            | 🟢 If URL + anon key set and valid                                                                                           |
| **Connectivity – Auth**                | 🟢 Same as Database                                                                                                          |
| **Connectivity – Python Bridge**       | 🟡 Green if `EXTRACTION_SERVICE_URL` set and service up; Red if route called and unset                                       |
| **Missing keys (vs .env.example)**     | `EXTRACTION_SERVICE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`                                       |
| **Naming conflict**                    | Docs use `SUPABASE_SERVICE_ROLE_KEY`; align `.env.local` and Python to this (or document fallback to `SUPABASE_SERVICE_KEY`) |
| **Security – NEXT*PUBLIC* on secrets** | ✅ None; all secrets are server-only                                                                                         |
| **Feature flags**                      | ✅ Sensible defaults when missing                                                                                            |
