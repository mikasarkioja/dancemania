# Architecture

## Data flow

- **Teacher content**: Upload → dance_library (video_url, motion_dna when processed). Admin labels segments (instructions JSONB) and reviews (status, verified_at). Published rows appear in the student library.
- **Student**: Library filters by status=published, genre, difficulty, role; client-side search on instructions (pattern/tags). Practice page plays video + overlay from instructions.
- **Encyclopedia**: move_registry entries with optional biomechanical_signature (static pose) and biomechanical_profile (target ranges). Lab view uses motion_dna from dance_library to drive 3D playback and Recharts (hip-tilt, foot-velocity over 8 counts).

## Engines

- **segmentation.ts** – Move boundaries from rhythm resets (mid_hip velocity local min, ankle tap threshold); similarity vs move_templates (cosine on joint angles). Used by Magic Wand (Web Worker).
- **signature-calculator.ts** – Average joint angles, velocity curves, hip-tilt curve, foot-velocity curve; DTW similarity; compareSignatureToRegistry for matching new moves to registry.
- **kinetic-chain-metrics.ts** – Ribcage circle, pelvic drop, head spot, lateral ankle velocity, lead-follow distance, compression/tension; classifyKineticChain (isolation_body | footwork | partner_connection).
- **candidate-move-job.ts** – identifyCandidateMoves(segments, registrySignatures): high-coordination segments that don’t match registry → candidate moves with kinetic_chain.
- **scout.ts** – Mock keyword search (move names/descriptions); suggestPendingMove when extraction finds an unmatched cluster.

## Beat-snap

- **rhythm-snap.ts** – findNearestBeat(currentTime, beatTimestamps, sensitivitySec). Used in VideoLabeler for Start/End Move and slider; saved instructions use snapped times. Arrow keys nudge selected segment to prev/next beat.

## Security

- RLS: dance_library and move_registry are readable by all; practice_sessions scoped to auth.uid(). Admin write (label/review/registry) typically via service role or future admin policy.
