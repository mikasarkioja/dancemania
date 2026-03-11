/**
 * Feature flags – toggles for Analysis, Gamification, Voice Feedback.
 * Change via env or future config; no code removal required.
 */

export const AUDIO_COACH = process.env.NEXT_PUBLIC_AUDIO_COACH === "true";
export const PARTNER_MODE = process.env.NEXT_PUBLIC_PARTNER_MODE === "true";
