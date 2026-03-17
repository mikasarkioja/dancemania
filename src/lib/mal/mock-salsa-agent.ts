/**
 * Mock SalsaAgent proposals for testing the Tinder-for-Labels UI without the live Python service.
 * Generates 3–5 realistic Salsa move suggestions with segments and biomechanical summaries.
 */

import type { SalsaAgentMetadata } from "@/types/mal";

const SALSA_MOVES: {
  move_name: string;
  compas3d_id: string;
  primary_axis: string;
  peak_velocity: number;
  beat_alignment: number;
}[] = [
  {
    move_name: "Right Turn",
    compas3d_id: "compas_r_turn_01",
    primary_axis: "vertical",
    peak_velocity: 0.42,
    beat_alignment: 0.02,
  },
  {
    move_name: "Cross Body Lead",
    compas3d_id: "compas_cbl_01",
    primary_axis: "lateral",
    peak_velocity: 0.38,
    beat_alignment: -0.01,
  },
  {
    move_name: "Dile Que No",
    compas3d_id: "compas_dqn_01",
    primary_axis: "sagittal",
    peak_velocity: 0.35,
    beat_alignment: 0.05,
  },
  {
    move_name: "Open Break",
    compas3d_id: "compas_open_01",
    primary_axis: "lateral",
    peak_velocity: 0.28,
    beat_alignment: 0.0,
  },
  {
    move_name: "Enchufla",
    compas3d_id: "compas_enchufla_01",
    primary_axis: "vertical",
    peak_velocity: 0.45,
    beat_alignment: -0.03,
  },
];

/** Generate 3–5 mock SalsaAgent proposals for a given video (for testing Tinder UI). */
export function generateMockSalsaAgentProposals(
  _videoId: string
): SalsaAgentMetadata[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
  const shuffled = [...SALSA_MOVES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  const now = new Date().toISOString();

  let cursor = 0;
  return selected.map((move) => {
    const duration = 1.5 + Math.random() * 1.5; // 1.5–3 s
    const startTime = Math.round(cursor * 10) / 10;
    const endTime = Math.round((cursor + duration) * 10) / 10;
    cursor = endTime + 0.5 + Math.random() * 1;

    const confidence = 0.72 + Math.random() * 0.24; // 0.72–0.96

    return {
      proposal_id: crypto.randomUUID(),
      source: "SalsaAgent_v1",
      confidence_score: Math.round(confidence * 1000) / 1000,
      label_suggestions: [
        {
          move_name: move.move_name,
          accuracy_weight: confidence,
          compas3d_id: move.compas3d_id,
        },
      ],
      segments: [{ startTime, endTime }],
      biomechanical_summary: {
        primary_axis: move.primary_axis,
        peak_velocity: move.peak_velocity,
        beat_alignment: move.beat_alignment,
      },
      created_at: now,
      status: "pending" as const,
    };
  });
}
