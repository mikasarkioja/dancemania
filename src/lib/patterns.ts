/**
 * Pattern names for segment labeling (admin). Used in VideoLabeler dropdown.
 * Expand by merging with move_registry names when loading the label page.
 */

/** Default patterns (Salsa & Bachata focus). Keep "Other" last. */
export const DEFAULT_PATTERNS = [
  // Salsa – basics & common
  "Basic",
  "Basic step",
  "Box-step",
  "Back step",
  "Forward step",
  "Side step",
  "Right turn",
  "Left turn",
  "Cross body lead",
  "Cross body",
  "CBL",
  "Open break",
  "Closed break",
  "Enchufla",
  "Enchufla (inside turn)",
  "Dile que no",
  "Dile que sí",
  "Vacilala",
  "Pendulo",
  "Pendulum",
  "Completo",
  "Full turn",
  "Half turn",
  "Single turn",
  "Double turn",
  "Inside turn",
  "Outside turn",
  "Hammerlock",
  "Copa",
  "Copa (wrap)",
  "Sombrero",
  "Hair comb",
  "70",
  "Setenta",
  "Adios",
  "Adios con hermana",
  "La prima",
  "Exhibela",
  "Paseala",
  "Titanic",
  "Pretzel",
  "Windmill",
  "Rope spinning",
  "Wraps & counter-wraps",
  "Open position",
  "Closed position",
  "Hand to hand",
  "Shine",
  "Suzy Q",
  "Crossover",
  "Latin walk",
  "Guapea",
  "Guapea (basic)",
  // Bachata
  "Bachata basic",
  "Bachata side basic",
  "Tap",
  "Hip tap",
  "Fourth beat tap",
  "Dominican basic",
  "Sensual basic",
  "Body roll",
  "Wave",
  "Figure 8",
  "Head roll",
  "Isolation",
  "Bachata turn",
  "Lady's turn",
  "Man's turn",
  "Shadow position",
  "Cuddle",
  "Pretzel (bachata)",
  "Dip",
  "Hair comb (bachata)",
  // Generic
  "Other",
] as const;

/** Type for a single pattern string. */
export type PatternName = (typeof DEFAULT_PATTERNS)[number] | string;

/**
 * Merge registry names (e.g. from move_registry.name) with default patterns.
 * Dedupes and keeps "Other" last. Registry names take precedence for order.
 */
export function mergePatternsWithRegistry(registryNames: string[]): string[] {
  const seen = new Set<string>(
    registryNames.map((n) => n.trim()).filter(Boolean)
  );
  const out = [...registryNames.filter((n) => n.trim())];
  for (const p of DEFAULT_PATTERNS) {
    if (p === "Other") continue;
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  if (!seen.has("Other")) out.push("Other");
  return out;
}
