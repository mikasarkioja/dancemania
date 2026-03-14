# Populating motion_dna (pose data)

Admin **Review** shows a **skeleton overlay** on the video only when the row has **motion_dna** in `dance_library`. **Dictionary Lab** lists only videos where `motion_dna` is not null.

## Why you see "No skeleton" / no videos in Dictionary Lab

- **Admin Review**: If the video has no `motion_dna` (or `motion_dna.frames` is empty), you see the message *"No skeleton data"* and no overlay. The video plays normally.
- **Dictionary Lab**: The page queries `dance_library` with `.not("motion_dna", "is", null)`, so only rows with pose data appear.

**Approving in Admin Review** only sets `status = 'published'`; it does **not** create or fill `motion_dna`. You must populate `motion_dna` with a separate **pose extraction** step.

## How to get motion_dna

This repo does **not** include a pose extraction script. You need to:

1. Run your own pipeline (e.g. MediaPipe, BlazePose, or your Python/Node service) on each video.
2. Write the result into `dance_library.motion_dna` for the corresponding row (by `id`).

Expected shape (JSONB) matches `PoseData` / `MotionDNA` in `src/types/dance.ts`:

- **frames**: array of pose frames. Each frame:
  - **timestamp**: number (ms or seconds; used for sync)
  - **partner_id**: `0` (leader) or `1` (follower)
  - **joints**: `Record<string, { x, y, z, visibility }>` — e.g. `left_shoulder`, `right_shoulder`, `left_elbow`, `right_elbow`, `left_wrist`, `right_wrist`, `left_hip`, `right_hip`, `left_knee`, `right_knee`, `left_ankle`, `right_ankle` (normalized 0–1 or same coord system as your canvas)
  - **metrics**: `{ rhythm_pulse, joint_angles }` (optional but used by some features)
- **durationMs**: number
- **metadata**: optional, e.g. `{ beat_timestamps: number[] }` for beat-snap

Once `motion_dna` is written for a video:

- **Admin Review** will show the skeleton overlay (blue = leader, pink = follower).
- **Dictionary Lab** will include that video in the list.

## Summary

| Goal                         | What to do                                                                 |
|-----------------------------|----------------------------------------------------------------------------|
| See skeleton in Admin Review| Populate `dance_library.motion_dna` for that video (pose extraction).     |
| See videos in Dictionary Lab| Same: only rows with non-null `motion_dna` are shown.                     |
| Publish after review        | Use "Approve & Publish" in Admin Review (sets `status`, does not add data).|
