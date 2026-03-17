/**
 * Model-Assisted Labeling (MAL): TypeScript interfaces for SalsaAgent metadata,
 * AI proposals, and integrity fields (created_at, status) for the Tinder verification flow.
 */

/** Reference label suggestion from the model (e.g. CoMPAS3D expert dataset). */
export interface LabelSuggestion {
  move_name: string;
  /** Weight or confidence for this suggestion (0–1). */
  accuracy_weight: number;
  /** Optional reference ID from the expert dataset (CoMPAS3D). */
  compas3d_id?: string | null;
}

/** Time segment where the move was detected (seconds). */
export interface MALSegment {
  startTime: number;
  endTime: number;
}

/** Simplified biomechanical indicators for the UI. */
export interface BiomechanicalSummary {
  /** Primary movement axis (e.g. "lateral", "sagittal"). */
  primary_axis?: string | null;
  /** Peak velocity magnitude (normalized or m/s). */
  peak_velocity?: number | null;
  /** Beat alignment score or offset (e.g. 0 = on beat). */
  beat_alignment?: number | null;
}

/** MAL proposal status for integrity and duplicate prevention. */
export type MALProposalStatus = "pending" | "approved" | "rejected";

/**
 * Full SalsaAgent metadata for one suggested move. Stored in dance_library.ai_proposals[].
 * Every proposal includes created_at and status for integrity and session deduplication.
 */
export interface SalsaAgentMetadata {
  /** Unique proposal id (UUID). */
  proposal_id: string;
  /** Model version for tracking. */
  source: "SalsaAgent_v1";
  /** Overall confidence (0.0–1.0). */
  confidence_score: number;
  /** Ranked label suggestions (move_name, accuracy_weight, compas3d_id). */
  label_suggestions: LabelSuggestion[];
  /** Segment(s) where the move was detected (seconds). */
  segments: MALSegment[];
  /** Simplified indicators for the UI. */
  biomechanical_summary?: BiomechanicalSummary | null;
  /** When the proposal was created (ISO string). Prevents duplicate labeling sessions. */
  created_at: string;
  /** pending | approved | rejected. */
  status: MALProposalStatus;
}

/**
 * AI_PROPOSAL: alias for the stored MAL proposal shape (SalsaAgentMetadata).
 * Use this when reading/writing ai_proposals JSONB. For the Tinder UI, normalize
 * to the flattened shape in @/features/admin/components/AdminVerificationTinder (id, label, confidence, etc.).
 */
export type AI_PROPOSAL = SalsaAgentMetadata;

/** Type guard: value is a valid SalsaAgentMetadata (has proposal_id, status, created_at). */
export function isSalsaAgentMetadata(
  value: unknown
): value is SalsaAgentMetadata {
  if (value == null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.proposal_id === "string" &&
    o.source === "SalsaAgent_v1" &&
    typeof o.confidence_score === "number" &&
    Array.isArray(o.label_suggestions) &&
    Array.isArray(o.segments) &&
    typeof o.created_at === "string" &&
    (o.status === "pending" ||
      o.status === "approved" ||
      o.status === "rejected")
  );
}

/**
 * Flatten SalsaAgentMetadata to the Tinder UI proposal shape (id, label, confidence, startTime, endTime).
 * Use for LabelVerificationCard / AdminVerificationTinder. Keep the original metadata for promoteProposalToRegistry.
 */
export function salsaAgentMetadataToTinderShape(meta: SalsaAgentMetadata): {
  id: string;
  source: "SalsaAgent_v1";
  startTime: number;
  endTime: number;
  label: string;
  confidence: number;
} {
  const segment = meta.segments[0];
  return {
    id: meta.proposal_id,
    source: "SalsaAgent_v1",
    startTime: segment?.startTime ?? 0,
    endTime: segment?.endTime ?? 0,
    label: meta.label_suggestions[0]?.move_name ?? "Unknown",
    confidence: meta.confidence_score,
  };
}
