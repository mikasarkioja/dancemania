# DanceAI

Salsa and Bachata posture and rhythm analysis. Next.js app for teacher video labeling, student library discovery, move encyclopedia, and biomechanical analysis.

## Features

- **Student Library** – Browse published videos, filter by genre/role/difficulty, search by move name. Cards link to practice playback.
- **Move Encyclopedia** – Move registry with motion signatures, descriptions, teacher tips. Accordion by category.
- **Admin Labeling** – Mark move segments on a timeline, beat-snap to music grid. Magic Wand suggests segments from motion_dna.
- **Admin Review** – Video plus skeleton overlay (Leader blue, Follower pink), QC checklist, Swap IDs, segment loop. Approve or Reject.
- **Biomechanical Dictionary (Lab)** – 3D skeleton playback and Recharts: hip-tilt and foot-velocity over an 8-count measure.
- **Engines** – Segmentation, signature calculator (joint angles, velocity, DTW), kinetic chain metrics, candidate-move job.

## Tech Stack

Next.js 15, React 19, TypeScript, Supabase (Postgres, RLS, JSONB), Tailwind, Framer Motion, Recharts.

## Setup

1. Clone and run `npm install`.
2. Add `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply migrations: `supabase db push` or run SQL in `supabase/migrations/` in the Supabase dashboard.
4. Run `npm run dev` and open http://localhost:3000.

**Before loading your first video** (Supabase project, Storage bucket, Auth): see **[docs/SETUP.md](docs/SETUP.md)**.

Optional: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for AI-generated move descriptions.

### npm warning: "Unknown env config devdir"

This warning comes from an **environment variable** (`NPM_CONFIG_DEVDIR`) that npm does not recognize. Often it is set by the Cursor IDE or another tool (e.g. for node-gyp’s dev directory). It is **harmless** and does not affect installs or builds. To stop seeing it when running npm outside Cursor, unset it in your shell (e.g. `set NPM_CONFIG_DEVDIR=` in PowerShell, or remove it from your system/user environment variables).

## Scripts

- `npm run dev` – Dev server
- `npm run build` – Production build
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript check

## Key Routes

- `/` – Home
- `/library` – Student library (filter, search)
- `/encyclopedia` – Move registry
- `/practice/[videoId]` – Video and instruction overlay
- `/admin` – Upload; links to Label, Review, Dictionary
- `/admin/label/[id]` – Labeling with beat-snap and Magic Wand
- `/admin/review/[id]` – Review with skeleton and approve/reject
- `/admin/dictionary` – Lab: 3D playback and graphs

## Project Structure

- `src/app` – App Router pages and server actions
- `src/engines` – segmentation, signature-calculator, scout, kinetic-chain-metrics, candidate-move-job
- `src/features` – admin, library, encyclopedia, practice
- `src/lib` – Supabase, rhythm-snap, skeleton-canvas
- `src/types` – dance.ts (PoseFrame, MoveSegment, MoveRegistryEntry, etc.)
- `supabase/migrations` – SQL for dance_library, move_registry, video_moves, practice_sessions

See `docs/ARCHITECTURE.md` for data flow and engine overview. Recent changes: [CHANGELOG.md](CHANGELOG.md).
