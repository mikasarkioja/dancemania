# Admin workflow: from raw video to student-ready teaching content

This document describes how an **admin** (or **teacher** with rights) takes a teaching video from upload through pose extraction, labeling, QA, and **published** status so it appears in the student **Library** and **Practice** flows.

---

## Pipeline overview

| Step                    | Where in the app                                             | `dance_library.status`         | Outcome                                                            |
| ----------------------- | ------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------ |
| **1. Upload**           | `/admin` — Admin Upload form                                 | `pending_analysis`             | Row created; extraction API is fired automatically.                |
| **2. Pose extraction**  | Background — `POST /api/process-dance-video` + Python bridge | → `needs_labeling`             | `motion_dna` filled; ready for labeling.                           |
| **3. Label**            | `/admin/label` → open a video → `/admin/label/[id]`          | Usually still `needs_labeling` | Move segments + **instructions** (coach overlay copy) saved to DB. |
| **4. Review & publish** | `/admin/review/[id]`                                         | → `published` on **Approve**   | Video is visible to students (`status = published`).               |
| **(Optional) Reject**   | Same review page                                             | → `needs_relabeling`           | Fix labels in `/admin/label/[id]`, then review again.              |

**Students** only see videos where **`status = 'published'`** (e.g. Library, Practice routes query this).

---

## Prerequisites

1. **Supabase** — `videos` bucket + RLS so admins can upload (see migrations under `supabase/migrations`).
2. **Extraction service** — Set `EXTRACTION_SERVICE_URL` (and optional `EXTRACTION_API_KEY`) in your deployment. Without it, uploads stay **`pending_analysis`** and the API returns **503** when extraction is triggered.
3. **Service role** — `SUPABASE_SERVICE_ROLE_KEY` must be available to the Next app so `/api/process-dance-video` can write `motion_dna` after extraction.
4. **Caller role** — Only users with **`app_metadata.role`** `admin` or `teacher` may call the process API (see route handler).

---

## Step-by-step (operator checklist)

### Step 1 — Upload (`/admin`)

1. Set genre in the app header (Salsa / Bachata) if you filter content by genre.
2. Fill **title**, **slug**, **difficulty**, optional **BPM**.
3. Select **Partner** mode (Lead/Follower) for motion separation.
4. Complete **Partner Identification** (drawing seeds on the video).
5. Optionally enable **compress before upload**.
6. Submit — file goes to Storage; row is created with `status: pending_analysis`.
7. The client fires **`/api/process-dance-video`** with the new `rowId` (fire-and-forget).

**If extraction fails:** check server logs, env vars, and Python bridge health. You can retry by calling the API again with `{ "rowId": "<uuid>" }` (as admin/teacher).

### Step 2 — Wait for extraction

- Row moves to **`needs_labeling`** when extraction succeeds and `motion_dna` is saved.
- On the **Label videos** list (`/admin/label`), look for status **Needs labeling** (or use server logs / Supabase table).

### Step 3 — Label (`/admin/label/[id]`)

1. Add **move segments** and **instruction overlays** so students see timed coaching text during practice.
2. Save — updates **`instructions`** (and related fields as implemented in `video-labeler-wrapper`).
3. (Optional) Use **Biomechanical dictionary (Lab)** at `/admin/dictionary` for registry / curve work — see in-app copy there.

### Step 4 — Review & publish (`/admin/review/[id]`)

1. Confirm skeleton overlay tracks the teacher, beat/label checks as appropriate.
2. **Approve** → sets `status` to **`published`**, `verified_at` set; students can browse and practice.
3. **Reject** → `needs_relabeling` + reason; return to labeling, then review again.

### Step 5 — Verify for students

- Open **Library** (or Practice with video id) as a student user and confirm the video appears and plays with instructions.

---

## Status reference

| Status             | Meaning                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `pending_analysis` | Uploaded; waiting for successful extraction.                                   |
| `needs_labeling`   | `motion_dna` present; admin should label instructions / segments, then review. |
| `needs_relabeling` | Review asked for fixes; update labels, then re-review.                         |
| `draft`            | Legacy / manual draft state (if still in DB).                                  |
| `published`        | Live for students.                                                             |

---

## Progress in the UI

- **`/admin`** — Numbered supply-chain explainer, **Queue overview** counts by status, upload form. After upload, a **compact stepper** shows step 1 complete and links to Label.
- **`/admin/label`** — Each row shows **x/4 steps**, a **compact pipeline**, summary text, **Retry extraction** when status is `pending_analysis` and there is no `motion_dna`.
- **`/admin/label/[id]`** — Full **4-step stepper**, summary, retry + **Open Review / Publish** when the publish step is current.
- **`/admin/review/[id]`** — Same stepper at top + link back to Label; approve/reject below.

## Quick links (in-app)

| Page                      | URL                       |
| ------------------------- | ------------------------- |
| Admin home (upload)       | `/admin`                  |
| Label queue (all videos)  | `/admin/label`            |
| Review / publish          | `/admin/review/[videoId]` |
| Dictionary lab (optional) | `/admin/dictionary`       |

---

## Related code

- Upload + trigger extraction: `src/features/admin/components/AdminUpload.tsx`
- Process API: `src/app/api/process-dance-video/route.ts`
- Label UI: `src/app/admin/label/[id]/`
- Review / publish: `src/app/admin/review/[id]/video-reviewer-wrapper.tsx`
- Student visibility: e.g. `src/app/library/`, `src/app/practice/[videoId]/page.tsx` (`eq("status", "published")`)
