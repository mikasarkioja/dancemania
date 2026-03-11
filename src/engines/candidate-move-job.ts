/**
 * Background job: identify outlier movements in user-uploaded videos.
 * If a segment doesn't match a registry move but shows high coordination,
 * save as a Candidate Move for the encyclopedia (status = 'candidate'),
 * categorized by kinetic chain.
 */

import type { PoseFrame } from "@/types/dance";
import type { MoveSignature } from "./signature-calculator";
import { computeMoveSignature, compareSignatureToRegistry } from "./signature-calculator";
import { classifyKineticChain } from "./kinetic-chain-metrics";

/** Coordination score: simple proxy from velocity consistency and hip/foot alignment. */
const COORDINATION_THRESHOLD = 0.5;
const DTW_MATCH_THRESHOLD = 0.7;

export interface RegistryReference {
  moveId: string;
  name: string;
  hipTiltCurve: number[];
  footVelocityCurve: number[];
}

export interface CandidateMoveResult {
  name: string;
  kinetic_chain: "isolation_body" | "footwork" | "partner_connection";
  signature: MoveSignature;
  coordinationScore: number;
  suggestedLabel?: string;
}

/**
 * Compute a simple coordination score (0–1) from a signature: higher when
 * hip and foot curves have clear structure (non-zero variance, not flat noise).
 */
function coordinationScore(sig: MoveSignature): number {
  const hipVar = variance(sig.hipTiltCurve);
  const footVar = variance(sig.footVelocityCurve);
  const maxHip = Math.max(...sig.hipTiltCurve.map(Math.abs), 0.001);
  const maxFoot = Math.max(...sig.footVelocityCurve, 0.001);
  const score = Math.min(1, (hipVar / (maxHip * maxHip) + footVar / (maxFoot * maxFoot)) / 2);
  return Number.isFinite(score) ? score : 0;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
}

/**
 * Identify candidate moves: segments that don't match the registry but have
 * high coordination. Returns suggestions to insert into move_registry with
 * status = 'candidate' and kinetic_chain set.
 */
export function identifyCandidateMoves(
  segments: { frames: PoseFrame[]; label?: string }[],
  registrySignatures: RegistryReference[]
): CandidateMoveResult[] {
  const candidates: CandidateMoveResult[] = [];
  for (const seg of segments) {
    if (seg.frames.length < 10) continue;
    const sig = computeMoveSignature(seg.frames, 0);
    const coord = coordinationScore(sig);
    if (coord < COORDINATION_THRESHOLD) continue;
    const match = compareSignatureToRegistry(sig, registrySignatures);
    if (match && match.score >= DTW_MATCH_THRESHOLD) continue;
    const kinetic_chain = classifyKineticChain(seg.frames, 0);
    candidates.push({
      name: seg.label ?? "Unnamed move",
      kinetic_chain,
      signature: sig,
      coordinationScore: coord,
      suggestedLabel: seg.label,
    });
  }
  return candidates;
}
