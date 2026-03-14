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
- `--auto-name` – run auto-naming only: set `display_name` for rows whose **title** is generic (`IMG_`, `video_`, `v_`) and `display_name` is empty. Uses BPM + genre to generate a boutique name; if BPM is missing, uses `Studio Session - [Timestamp]`. Does not overwrite manually set names. Logs each new name to the terminal.

---

## No “full auto” commit to labels

There is **no** script that automatically inserts into `video_moves` or `instructions`. The flow is:

1. **Scanner** → fills `suggested_labels`
2. **You** → open Admin, see ghost blocks, click **Approve** (or use LabelSwipeStack) to commit a suggestion to `video_moves` and instructions

So “auto label” = **AI suggestions**; **you** approve.

---

## In-app “Run auto label” button (Admin → Label / [id])

The **Move labeling** page has a **Run auto label** button that runs a **JavaScript** pipeline (same idea as the Python Scanner but inside the app):

1. Loads the current video’s **motion_dna** and **move_registry** (approved) with **biomechanical_profile**.
2. Uses only registry rows whose **biomechanical_profile** contains **hip_tilt_curve** and **foot_velocity_curve** (arrays). These are the “Gold Standard” curves for DTW.
3. Sliding window over leader frames → `computeMoveSignature` → `compareSignatureToRegistry`; segments above the similarity threshold (0.55) are written to **suggested_labels**.

**If Run auto label returns no results:**

- **Error: “No Gold Standard moves…”**  
  No **move_registry** row has both `hip_tilt_curve` and `foot_velocity_curve` in **biomechanical_profile**. The DB migration only adds the column; the **curves** must be populated by your pipeline (e.g. Python `map_compas_to_supabase.py` or a script that computes and stores these arrays per move).
- **Success but 0 suggestions**  
  The UI will show a message like: “No segments matched the registry (similarity threshold 0.55)…”. So either the video’s motion_dna curves don’t match any registry curve well enough, or the threshold is too high. You can run the **Python** Scanner (which can use **vector_sequence** and different thresholds) and refresh the page to see those suggestions.

So the **in-app** button automates the same flow as the Scanner but depends on **hip_tilt_curve** / **foot_velocity_curve** in the registry; the **Python** script can use **vector_sequence** and other options.

---

## CoMPAS3D / MDD Gold Standard

To get suggestions from CoMPAS3D or MDD Traditional Bachata:

1. Import moves (e.g. `python scripts/map_compas_to_supabase.py --data-dir ./datasets/compas3d/segments`) so `move_registry` has rows with `source = compas3d_gold_standard` and `biomechanical_profile.vector_sequence`.
2. Run the Scanner as above; it will use those profiles for DTW and Bachata tap boost when applicable.
