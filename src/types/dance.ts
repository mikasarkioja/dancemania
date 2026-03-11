/**
 * DanceAI – single source of truth for pose and motion types.
 * Used in code and for Supabase JSONB (motion_dna, student_motion_data, metrics).
 */

/** 0 = Lead, 1 = Follower. Enables partner separation in stored motion. */
export type PartnerId = 0 | 1;

export const PARTNER_LEAD: PartnerId = 0;
export const PARTNER_FOLLOWER: PartnerId = 1;

export interface Joint3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  timestamp: number;
  /** 0 = Lead, 1 = Follower. Required for partner separation in JSON. */
  partner_id: PartnerId;
  joints: Record<string, Joint3D>;
  metrics: {
    rhythm_pulse: number;
    joint_angles: Record<string, number>;
  };
}

/** Optional metadata (e.g. from audio beat detection) for beat-snap labeling. */
export interface MotionMetadata {
  /** Beat times in seconds; used to snap move start/end to the grid (1 or 5). */
  beat_timestamps?: number[];
}

export interface PoseData {
  frames: PoseFrame[];
  durationMs: number;
  source?: "teacher" | "student" | "reference";
  metadata?: MotionMetadata;
}

/**
 * Teacher reference motion stored in dance_library.motion_dna (JSONB).
 * Same shape as PoseData with optional partner separation (frames may have partner_id).
 */
export type MotionDNA = PoseData;

export type DanceGenre = "salsa" | "bachata" | "other";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** (x,y) normalized 0–1 for resolution-independent seed points. */
export interface SeedPoint {
  x: number;
  y: number;
}

/**
 * Stored in dance_library.tracking_seeds (JSONB). Mid-hip anchor seeds for
 * stable tracking: extraction compares click to each skeleton's mid_hip.
 */
export interface TrackingSeeds {
  leader_hip_seed: SeedPoint;
  follower_hip_seed: SeedPoint;
}

/** Role for filtering: who the move is for (Leader, Follower, or Both). */
export type MoveRole = "Leader" | "Follower" | "Both";

/** Mechanics metadata (e.g. footwork, arm styling, connection). */
export interface MoveMechanics {
  [key: string]: unknown;
}

/** One move segment for overlay/captions. Stored in dance_library.instructions (JSONB). */
export interface MoveSegment {
  startTime: number;
  endTime: number;
  pattern: string;
  teacherInstruction: string;
  /** Optional: for filtering in library. */
  role?: MoveRole;
  category?: string;
  difficulty?: number;
  mechanics?: MoveMechanics;
  /** Optional: for text search in library. */
  tags?: string[];
}

export type DanceInstructions = MoveSegment[];

/**
 * Instruction marker with full metadata for library display and filtering.
 * Use when you have role, category, difficulty, mechanics (from MoveSegment or defaults).
 */
export interface InstructionMarker extends MoveSegment {
  role: MoveRole;
  category: string;
  difficulty: number;
  mechanics: MoveMechanics;
  /** Display label (defaults to pattern). */
  label?: string;
  /** Tags for text search (defaults to pattern + teacherInstruction). */
  tags?: string[];
}

/** A single row from dance_library (for client-side filtering). */
export interface DanceLibraryItem {
  id: string;
  title: string;
  slug?: string | null;
  video_url: string;
  instructions: MoveSegment[];
}

/** Static 3D pose for move_registry.biomechanical_signature (one keyframe). */
export interface BiomechanicalSignature {
  joints?: Record<string, { x: number; y: number; z: number; visibility?: number }>;
}

/** Target range (min/max) for a scalar metric. */
export interface TargetRange {
  min: number;
  max: number;
}

/** Stored in move_registry.biomechanical_profile: target ranges for key metrics. */
export interface BiomechanicalProfile {
  hip_tilt_max?: TargetRange;
  knee_flexion_avg?: TargetRange;
  torso_isolation_index?: TargetRange;
  rhythmic_sync_offset?: TargetRange;
}

/** Kinetic chain category for move classification. */
export type KineticChainCategory =
  | "isolation_body"
  | "footwork"
  | "partner_connection";

/** One row from move_registry (encyclopedia entry). */
export interface MoveRegistryEntry {
  id: string;
  name: string;
  category: string;
  role: MoveRole;
  description: string | null;
  teacher_tips: string | null;
  biomechanical_signature: BiomechanicalSignature | null;
  biomechanical_profile: BiomechanicalProfile | null;
  kinetic_chain: KineticChainCategory | null;
  source_urls: string[];
  status: "approved" | "pending" | "candidate";
  created_at?: string;
  updated_at?: string;
}
