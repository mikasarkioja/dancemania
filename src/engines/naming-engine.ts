/**
 * Creative Director: generates boutique-style session names from BPM, genre, and moves.
 * Used when a student saves a practice session to suggest aspirational, artistic names.
 */

export interface NamingInput {
  bpm: number;
  genre: string;
  top_moves: string[];
}

export interface NamingPrompt {
  system: string;
  user: string;
}

const CREATIVE_DIRECTOR_SYSTEM = `You are a creative director for a luxury dance brand. Suggest names that feel aspirational and artistic. Avoid generic names like "Salsa 1." Reply with exactly 3 names, one per line. No numbering, bullets, or extra text. Each name should be 2-5 words and evocative.`;

/**
 * Build the prompt for the Creative Director LLM call.
 */
export function buildSessionNamingPrompt(input: NamingInput): NamingPrompt {
  const { bpm, genre, top_moves } = input;
  const movesList =
    top_moves.length > 0 ? top_moves.join(", ") : "general practice";
  const bpmPhrase = bpm > 0 ? `with a ${bpm} BPM` : "at a comfortable tempo";
  const user = `Based on a ${genre} dance ${bpmPhrase} and these moves: ${movesList}, suggest 3 names that feel aspirational and artistic. Avoid generic names like "Salsa 1." Reply with exactly 3 names, one per line. No numbering or bullets.`;
  return {
    system: CREATIVE_DIRECTOR_SYSTEM,
    user,
  };
}

/**
 * Parse 3 names from LLM response (one per line, strip numbering/bullets).
 */
export function parseSessionNames(text: string): string[] {
  const lines = text
    .split(/\n/)
    .map((line) => line.replace(/^[\d.)\-\*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
  return lines.slice(0, 3);
}

/**
 * Fallback names when no LLM is available.
 */
export function getMockSessionNames(input: NamingInput): string[] {
  const { genre, top_moves } = input;
  const first = top_moves[0];
  const base = first ? `${first} Flow` : `${genre} Session`;
  return [
    `${base} · Evening`,
    `Golden ${genre}`,
    `Signature ${first || genre}`,
  ];
}
