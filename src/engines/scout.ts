/**
 * Discovery engine: mock web scraper for move names/descriptions and
 * self-expansion logic (pending moves when Motion DNA doesn't match registry).
 */

import type { MoveRegistryEntry, MoveRole } from "@/types/dance";
import type { BiomechanicalSignature } from "@/types/dance";

export interface ScrapedMove {
  name: string;
  description: string;
  category: string;
  role: MoveRole;
  source_urls: string[];
}

/**
 * Mock-fetch move names and descriptions by keyword (simulated web scraper).
 * In production this would call a real search/scrape API.
 */
export async function mockFetchMovesByKeyword(
  keyword: string
): Promise<ScrapedMove[]> {
  await new Promise((r) => setTimeout(r, 300));
  const k = keyword.toLowerCase();
  const mock: ScrapedMove[] = [];
  if (k.includes("salsa")) {
    mock.push(
      {
        name: "Cross body lead",
        description: "Lead moves follower across the slot with a clear frame signal.",
        category: "Fundamentals",
        role: "Both",
        source_urls: ["https://example.com/salsa-patterns"],
      },
      {
        name: "Enchufla",
        description: "Follower turns under the lead's arm while maintaining connection.",
        category: "Turns",
        role: "Both",
        source_urls: [],
      },
      {
        name: "Dile que no",
        description: "Classic Salsa move with a hesitation step and direction change.",
        category: "Footwork",
        role: "Both",
        source_urls: [],
      }
    );
  }
  if (k.includes("bachata") || k.includes("2026") || k.includes("pattern")) {
    mock.push(
      {
        name: "Box step",
        description: "Basic 4-count step forming a box pattern.",
        category: "Basics",
        role: "Both",
        source_urls: [],
      },
      {
        name: "Pendulo",
        description: "Swing motion of the body following the music.",
        category: "Body movement",
        role: "Both",
        source_urls: [],
      }
    );
  }
  if (mock.length === 0) {
    mock.push({
      name: `Discovered: ${keyword.slice(0, 40)}`,
      description: "Auto-discovered from search. Review and edit in the registry.",
      category: "Uncategorized",
      role: "Both",
      source_urls: [],
    });
  }
  return mock;
}

/** Normalized cluster signature for matching (e.g. average joint angles). */
export interface MotionClusterSignature {
  name?: string;
  jointAngles?: Record<string, number>;
  role?: MoveRole;
}

/**
 * Check if a motion cluster matches any approved registry entry (by name or signature).
 */
export function findMatchingMove(
  cluster: MotionClusterSignature,
  registry: MoveRegistryEntry[]
): MoveRegistryEntry | null {
  const approved = registry.filter((m) => m.status === "approved");
  if (cluster.name) {
    const byName = approved.find(
      (m) => m.name.toLowerCase().trim() === cluster.name!.toLowerCase().trim()
    );
    if (byName) return byName;
  }
  if (cluster.jointAngles && Object.keys(cluster.jointAngles).length > 0) {
    for (const move of approved) {
      const sig = move.biomechanical_signature;
      if (!sig?.joints) continue;
      const similarity = cosineSimilaritySignatures(
        cluster.jointAngles,
        jointsToAngleVector(sig.joints)
      );
      if (similarity > 0.85) return move;
    }
  }
  return null;
}

function jointsToAngleVector(
  joints: Record<string, { x: number; y: number; z: number }>
): number[] {
  const keys = Object.keys(joints).sort();
  return keys.flatMap((k) => {
    const j = joints[k];
    return [j.x, j.y, j.z];
  });
}

function cosineSimilaritySignatures(
  a: Record<string, number>,
  b: number[]
): number {
  const aKeys = Object.keys(a).sort();
  const aVec = aKeys.map((k) => a[k] ?? 0);
  const bSlice = b.slice(0, aVec.length);
  while (bSlice.length < aVec.length) bSlice.push(0);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < aVec.length; i++) {
    dot += aVec[i] * bSlice[i];
    na += aVec[i] * aVec[i];
    nb += bSlice[i] * bSlice[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : Math.max(0, Math.min(1, dot / denom));
}

/** Suggested pending move for admin review when no registry match is found. */
export interface PendingMoveSuggestion {
  name: string;
  category: string;
  role: MoveRole;
  description: string;
  biomechanical_signature: BiomechanicalSignature | null;
  source: "scout" | "extraction";
}

/**
 * If the extraction engine finds a Motion DNA cluster that doesn't match the
 * move_registry, returns a Pending Move suggestion for admin review.
 */
export function suggestPendingMove(
  cluster: MotionClusterSignature,
  registry: MoveRegistryEntry[]
): PendingMoveSuggestion | null {
  if (findMatchingMove(cluster, registry)) return null;
  const name = cluster.name ?? "Unnamed move";
  return {
    name,
    category: "Uncategorized",
    role: cluster.role ?? "Both",
    description: "",
    biomechanical_signature: null,
    source: "extraction",
  };
}
