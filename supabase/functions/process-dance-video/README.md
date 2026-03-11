# process-dance-video

Supabase Edge Function triggered by a **Database Webhook** when a new row is inserted into `public.dance_library` with a `video_url`.

## What it does

- Receives the webhook payload (new row: `id`, `video_url`, `tracking_seeds`, etc.).
- Validates that it’s an `INSERT` on `dance_library` and that `video_url` is present.
- Placeholder for calling the Python extraction engine with `video_url` and `tracking_seeds` to produce `motion_dna` and update the row.

## Database Webhook setup

1. In **Supabase Dashboard** go to **Database** → **Webhooks** (or **Integrations** → **Webhooks**).
2. Create a new webhook:
   - **Name:** e.g. `on_dance_library_insert`
   - **Table:** `public.dance_library`
   - **Events:** **Insert**
   - **URL:**  
     `https://<your-project-ref>.supabase.co/functions/v1/process-dance-video`
   - **HTTP method:** POST  
   - Add the **Authorization** header with the service role (or anon) key if your function requires it.
3. (Optional) Use a **filter** so the webhook only runs when `video_url` is not null.

For **local** development, use:

`http://host.docker.internal:54321/functions/v1/process-dance-video`

and run the function with:

`supabase functions serve process-dance-video`

## Deploy

```bash
supabase functions deploy process-dance-video
```

After deploying, set the webhook URL in the Dashboard to the deployed function URL.
