# Setup: Before Your First Video

Do this once so you can upload a video from **Admin** and see it in the **Library** and **Practice** flow.

## 1. Supabase project and env

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. In the project: **Settings → API** copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In the repo root create `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

## 2. Database and storage

Apply all migrations so tables and the **videos** bucket exist. Use either the terminal or the SQL Editor.

### Option A: Terminal (one command)

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if needed (or use `npx`; the project has it as a dev dependency).
2. Log in so the CLI can talk to Supabase (uses your Supabase account, not the project URL/anon key):

   ```bash
   npx supabase login
   ```

   This opens a browser to get an access token. Alternatively, create a token at [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) and set `SUPABASE_ACCESS_TOKEN` in your environment.

3. From the repo root, link your project (use the **Reference ID** from Supabase Dashboard → Settings → General):

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   When prompted, enter your **database password** (Dashboard → Settings → Database).

3. Push all migrations in one go:

   ```bash
   npx supabase db push
   ```

   This runs every file in `supabase/migrations/` in order.

### Option B: SQL Editor (run each file once)

1. In Supabase Dashboard go to **SQL Editor**.
2. Run the contents of each migration file **in this order** (open the file, copy all, paste into a new query, Run):
   - `20250111000001_dance_library_and_sessions.sql`
   - `20250112000002_dance_library_tracking_seeds.sql`
   - `20250113000003_dance_library_instructions.sql`
   - `20250114000004_dance_library_review_status.sql`
   - `20250115000005_move_registry_and_video_moves.sql`
   - `20250116000006_move_registry_biomechanical_profile.sql`
   - `20250117000007_videos_bucket_and_upload_policies.sql`

The last migration creates the Storage bucket **videos** (public) and policies so **authenticated** users can upload and insert/update **dance_library**.

## 3. Auth (required for upload)

Upload uses the **authenticated** user, so you must be signed in.

1. In Supabase Dashboard: **Authentication → Providers**. Enable at least one (e.g. **Email** with “Confirm email” off for quick testing).
2. In the app, go to **Login** and sign in (or use the auth callback if you use OAuth).  
   If the login page is still a placeholder, create a user under **Authentication → Users → Add user** and sign in via the Supabase client (e.g. magic link or a minimal email/password form you add).

## 4. Run the app and upload

1. From the repo root: `npm install` then `npm run dev`.
2. Open http://localhost:3000, sign in, then go to **Admin**.
3. Fill title, slug, genre, difficulty, pick a video file, complete **Partner Identification** (Leader and Follower seeds), then **Upload to library**.
4. The video is stored in the **videos** bucket and a row is added to **dance_library**. You can then open **Label** for that video, and **Library** / **Practice** (for published items once you set status).

## Optional: Test without implementing login (dev only)

If you want to upload before wiring the login UI, you can temporarily allow anonymous insert (insecure; use only locally):

1. In Supabase **SQL Editor** run:

   ```sql
   -- Dev only: allow anon to upload and insert (remove in production)
   CREATE POLICY "videos_anon_upload_dev" ON storage.objects
     FOR INSERT TO anon WITH CHECK (bucket_id = 'videos');
   CREATE POLICY "dance_library_insert_anon_dev" ON public.dance_library
     FOR INSERT TO anon WITH CHECK (true);
   ```

2. Then you can upload from **Admin** without signing in. Remove these policies before deploying.

## Troubleshooting

- **“Missing NEXT_PUBLIC_SUPABASE_URL or …”** → Add both vars to `.env.local` and restart `npm run dev`.
- **Upload fails with permission/RLS error** → Run the migrations (step 2) and, for upload, sign in (step 3), or use the optional anon policies above for local dev only.
- **Video doesn’t play in Library/Practice** → Check that the bucket **videos** is **public** (migration 20250117000007 sets this) and that `video_url` in `dance_library` is the public URL from Storage.
