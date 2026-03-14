# Auto-label (Scanner) – how to run

The app has **one auto-label pipeline**: the **Scanner** script. It does **not** write final labels by itself; it fills **suggested labels** so you can approve them in the Admin UI.

---

## What it does

1. Fetches **Gold Standard** moves from `move_registry` (status = `approved`), including:
   - `vector_sequence` (CoMPAS3D / MDD) for DTW matching
   - `hip_tilt_curve` / `foot_velocity_curve` when present
2. For each **dance_library** video that has **motion_dna**, runs `suggest_labels(motion_dna, registry_profiles)` (sliding-window + DTW/curves; Bachata tap boost when applicable).
3. Writes the result into **`dance_library.suggested_labels`** (JSONB).

After that, in **Admin → Dictionary Lab** or **Admin → Label / [id]** you see ghost blocks and use **Approve** to turn suggestions into real `video_moves` + instructions.

---

## How to run the Scanner

### 1. Install Python deps

```bash
pip install -r scripts/requirements.txt
```

### 2. Set Supabase env

Use either:

- **Service role (recommended):** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`  
  (from [Supabase](https://supabase.com/dashboard) → Project → Settings → API)
- Or: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_KEY` if you use that naming.

You can put them in `.env.local` and load with `python-dotenv`, or export in the shell.

### 3. Run the script

**All videos with motion_dna:**

```bash
# Windows (PowerShell)
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
python scripts/process_pending.py
```

```bash
# macOS / Linux
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
python scripts/process_pending.py
```

**One video only:**

```bash
python scripts/process_pending.py --video-id <dance_library-uuid>
```

**Options:**

- `--threshold 0.7` – similarity threshold 0–1 (default 0.7)
- `--motion motion.json --registry registry.json` – file-only mode (no DB); writes JSON to stdout or `--out file.json`

---

## No “full auto” commit to labels

There is **no** script that automatically inserts into `video_moves` or `instructions`. The flow is:

1. **Scanner** → fills `suggested_labels`
2. **You** → open Admin, see ghost blocks, click **Approve** (or use LabelSwipeStack) to commit a suggestion to `video_moves` and instructions

So “auto label” = **AI suggestions**; **you** approve.

---

## CoMPAS3D / MDD Gold Standard

To get suggestions from CoMPAS3D or MDD Traditional Bachata:

1. Import moves (e.g. `python scripts/map_compas_to_supabase.py --data-dir ./datasets/compas3d/segments`) so `move_registry` has rows with `source = compas3d_gold_standard` and `biomechanical_profile.vector_sequence`.
2. Run the Scanner as above; it will use those profiles for DTW and Bachata tap boost when applicable.
