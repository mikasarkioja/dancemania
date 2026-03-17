"""
Scanner / process-pending: fetch move_registry Gold Standard, suggest_labels for dance_library.

Auto-naming (--auto-name):
  - What it does: Sets dance_library.display_name when the *title* looks like a
    generic filename (IMG_*, video_*, v_*, PXL_*). Uses BPM + genre to generate a
    friendly name (e.g. "Energetic Midnight Salsa") or "Studio Session - <time>"
    if BPM is missing. The UI (Label videos, etc.) should show display_name when
    set, otherwise title.
  - What it does NOT do: It does not analyze video/audio content. It does not
    detect BPM or genre from the file—those must already be in the DB (from
    upload form or another pipeline). "Content-based" labelling would require
    a separate step (e.g. audio BPM detection, motion_dna extraction).
See scripts/README-auto-label.md for usage (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
"""

import argparse
import datetime
import os
import sys

# Load .env.local from project root so SUPABASE_* can be set there
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_script_dir)
_env_local = os.path.join(_project_root, ".env.local")
if os.path.isfile(_env_local):
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_local)
    except ImportError:
        pass

# Optional: use supabase-py if available (pip install supabase)
try:
    from supabase import create_client as _create_supabase
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

# Generic filename prefixes that we replace with a boutique name (matched case-insensitively)
GENERIC_PREFIXES = ("img_", "video_", "v_", "pxl_")


def _is_generic_name(name):
    """True if the name looks like a generic upload (IMG_, video_, v_, etc.)."""
    if not name or not name.strip():
        return False
    lower = name.strip().lower()
    return any(lower.startswith(p) for p in GENERIC_PREFIXES)


def generate_pro_name(bpm, genre, filename):
    """
    Generates a boutique-style name if the current filename is generic.
    If bpm is None or cannot be used, returns 'Studio Session - [Timestamp]'.
    """
    # Skip if the video already has a custom name
    if not _is_generic_name(filename):
        return filename

    # Fallback when BPM is not detected
    if bpm is None:
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        return f"Studio Session - {ts}"

    try:
        bpm_val = int(bpm)
    except (TypeError, ValueError):
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        return f"Studio Session - {ts}"

    # 1. Intensity Descriptor
    if bpm_val > 170:
        adj = "High-Tempo"
    elif bpm_val > 140:
        adj = "Energetic"
    elif bpm_val > 110:
        adj = "Fluid"
    else:
        adj = "Silky"

    # 2. Vibe based on Time of Day
    hour = datetime.datetime.now().hour
    if 5 <= hour < 12:
        vibe = "Sunrise"
    elif 12 <= hour < 18:
        vibe = "Golden"
    else:
        vibe = "Midnight"

    # 3. Format: "Energetic Midnight Salsa" (capitalize genre for display)
    genre_display = (genre or "Session").strip().title()
    if not genre_display:
        genre_display = "Session"
    return f"{adj} {vibe} {genre_display}"


def resolve_display_name(bpm, genre, title, current_display_name):
    """
    Returns (new_display_name, should_update).
    Only suggests an update when:
    - title is generic (IMG_, video_, v_), and
    - current_display_name is not already set (we do not overwrite manually set names).
    """
    if not _is_generic_name(title):
        return None, False
    if current_display_name and current_display_name.strip():
        return None, False
    name = generate_pro_name(bpm, genre, title or "")
    return name, True


def get_supabase_client():
    """Create Supabase client from env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."""
    if not HAS_SUPABASE:
        print("pip install supabase required for DB operations.", file=sys.stderr)
        return None
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_KEY).", file=sys.stderr)
        return None
    return _create_supabase(url, key)


def run_auto_name(supabase, video_id=None, verbose=False):
    """
    For each dance_library row (optionally filtered by video_id):
    - If title is generic and display_name is empty, set display_name via generate_pro_name.
    - Log each new name to the terminal.
    """
    table = supabase.table("dance_library")
    query = table.select("id, title, display_name, bpm, genre")
    if video_id:
        query = query.eq("id", video_id)
    rows = query.execute()
    if not rows.data:
        if verbose:
            print("[auto-name] No rows in dance_library (or none match --video-id).")
        return
    if verbose:
        print(f"[auto-name] Found {len(rows.data)} row(s). Generic titles: IMG_*, video_*, v_* (case-insensitive).")
    updated = 0
    for row in rows.data:
        title = row.get("title") or ""
        display_name = row.get("display_name")
        bpm = row.get("bpm")
        genre = row.get("genre") or "other"
        new_name, should = resolve_display_name(bpm, genre, title, display_name)
        if verbose:
            generic = _is_generic_name(title)
            reason = (
                "skip: title not generic"
                if not generic
                else "skip: display_name already set"
                if (display_name and display_name.strip())
                else "update"
                if should and new_name
                else "skip: no name generated"
            )
            print(f"  id={row['id'][:8]}... title={title!r} -> {reason}" + (f" -> {new_name!r}" if should and new_name else ""))
        if should and new_name:
            table.update({"display_name": new_name}).eq("id", row["id"]).execute()
            print(f"[auto-name] {row['id']}: {new_name}")
            updated += 1
    if verbose:
        print(f"[auto-name] Done. Updated {updated} row(s).")
    return


def apply_display_name_on_update(row_id, bpm, genre, title, current_display_name, supabase=None):
    """
    Call this when your pipeline updates dance_library (e.g. after writing motion_dna).
    If title is generic and display_name is not manually set, updates display_name and prints it.
    """
    new_name, should = resolve_display_name(bpm, genre, title, current_display_name)
    if not should or not new_name:
        return
    client = supabase or get_supabase_client()
    if not client:
        return
    client.table("dance_library").update({"display_name": new_name}).eq("id", row_id).execute()
    print(f"[auto-name] {row_id}: {new_name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scanner + auto-naming for dance_library")
    parser.add_argument("--video-id", type=str, help="Process only this dance_library id")
    parser.add_argument("--auto-name", action="store_true", help="Run auto-naming only (set display_name for generic titles)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print each row and why it was skipped or updated")
    parser.add_argument("--threshold", type=float, default=0.7, help="Similarity threshold for Scanner (future)")
    args = parser.parse_args()

    if args.auto_name:
        client = get_supabase_client()
        if client:
            run_auto_name(client, video_id=args.video_id, verbose=args.verbose)
        sys.exit(0 if client else 1)

    # TODO: Scanner – fetch move_registry, suggest_labels, write suggested_labels.
    # When the Scanner updates dance_library rows, call apply_display_name_on_update(...) for each
    # so display_name is set at the same time (and only for generic titles, without overwriting manual names).
    print("process_pending.py: Scanner not yet implemented. Use --auto-name to run auto-naming only.")
