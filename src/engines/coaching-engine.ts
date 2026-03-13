/**
 * AI Coaching Interpretation Layer (Math Second).
 * Maps comparison_results (deltas in hip tilt, timing, posture) to LLM prompt
 * and focus areas for genre-specific, boutique-instructor-style feedback.
 */

import type { ComparisonResult } from "./comparison-engine";

export type DanceGenre = "Salsa" | "Bachata";

const TIMING_OFFSET_MS_THRESHOLD = 200;
const HIP_TILT_ISOLATION_THRESHOLD = 0.6;
const SHOULDER_FRAME_TENSION_THRESHOLD = 0.6;

export interface CoachingInput {
  comparisonResult: ComparisonResult;
  genre: DanceGenre;
  timing_offset_ms?: number;
}

export interface FocusAreas {
  rhythmPulse: boolean;
  cubanMotion: boolean;
  frame: boolean;
}

export function getCoachingFocusAreas(input: CoachingInput): FocusAreas {
  const { comparisonResult, timing_offset_ms = 0 } = input;
  const { metrics } = comparisonResult;
  return {
    rhythmPulse:
      timing_offset_ms > TIMING_OFFSET_MS_THRESHOLD ||
      Math.abs(timing_offset_ms) > TIMING_OFFSET_MS_THRESHOLD,
    cubanMotion: metrics.isolationAvg < HIP_TILT_ISOLATION_THRESHOLD,
    frame: metrics.tensionAvg < SHOULDER_FRAME_TENSION_THRESHOLD,
  };
}

export function buildCoachingPrompt(input: CoachingInput): {
  system: string;
  user: string;
} {
  const focus = getCoachingFocusAreas(input);
  const { comparisonResult, genre } = input;
  const { correctionTips, metrics } = comparisonResult;

  const system = `You are a high-end, encouraging female dance instructor in a boutique studio. Given biomechanical feedback from a practice session, provide exactly 3 short, actionable "Pro Tips" using dance terms like "On1", "Frame", or "Cuban Motion" as relevant for ${genre}. Keep the tone sophisticated, professional, and slightly feminine (you may use emojis like ✨ or 💃 sparingly). Each tip should be one or two sentences.`;

  const parts: string[] = [
    "Biomechanical errors and metrics from this session:",
    `- Overall score: ${(comparisonResult.score * 100).toFixed(0)}%`,
    `- Tension (shoulder–hip alignment): ${(metrics.tensionAvg * 100).toFixed(0)}%`,
    `- Isolation (hip/shoulder stability): ${(metrics.isolationAvg * 100).toFixed(0)}%`,
    `- Placement: ${(metrics.placementAvg * 100).toFixed(0)}%`,
  ];

  if (focus.rhythmPulse) {
    parts.push(
      "- Focus area: Rhythm pulse / timing (student is off the beat)."
    );
  }
  if (focus.cubanMotion) {
    parts.push(
      "- Focus area: Cuban motion / hip movement needs more juiciness and isolation."
    );
  }
  if (focus.frame) {
    parts.push("- Focus area: Frame (shoulder stability and connection).");
  }

  if (correctionTips.length > 0) {
    parts.push("Specific correction tips from the analysis:");
    correctionTips.slice(0, 5).forEach((t) => parts.push(`- ${t.message}`));
  }

  parts.push(
    '\nProvide exactly 3 Pro Tips as a JSON array of strings, e.g. ["Tip 1", "Tip 2", "Tip 3"]. No other text.'
  );

  const user = parts.join("\n");
  return { system, user };
}

export interface CoachingFeedback {
  proTips: string[];
  focusAreas: FocusAreas;
  generatedAt: string;
}

export function parseCoachingResponse(
  llmResponse: string,
  focusAreas: FocusAreas
): CoachingFeedback {
  const trimmed = llmResponse.trim();
  let proTips: string[] = [];
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        proTips = parsed
          .filter((t): t is string => typeof t === "string")
          .slice(0, 3);
      }
    } catch {
      // fallback
    }
  }
  if (proTips.length === 0) {
    proTips = trimmed
      .split(/\n+/)
      .map((s) => s.replace(/^[-*\d.]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  const defaultTips = [
    "Keep practicing with the reference video. ✨",
    "Focus on relaxing your shoulders and matching the beat. 💃",
    "Add more hip movement for that Cuban motion.",
  ];
  return {
    proTips: proTips.length > 0 ? proTips : defaultTips,
    focusAreas,
    generatedAt: new Date().toISOString(),
  };
}
