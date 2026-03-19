/**
 * Persona (growth stage) derived from Omatase (XP) for the Bloom Garden and dashboard.
 */

export type Persona = "Seedling" | "Blossom" | "Performer";

const TIERS: { minXp: number; persona: Persona }[] = [
  { minXp: 500, persona: "Performer" },
  { minXp: 100, persona: "Blossom" },
  { minXp: 0, persona: "Seedling" },
];

export function getPersonaFromXp(omatase: number): Persona {
  const tier = TIERS.find((t) => omatase >= t.minXp);
  return tier?.persona ?? "Seedling";
}
