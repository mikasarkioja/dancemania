"use server";

/**
 * Generate AI coaching feedback from comparison result and save to practice_sessions.metrics.
 * Uses coaching-engine for prompt and parsing; OpenAI or Anthropic for LLM; falls back to defaults.
 */

import { createClient } from "@/lib/supabase/server";
import type { ComparisonResult } from "@/engines/comparison-engine";
import {
  getCoachingFocusAreas,
  buildCoachingPrompt,
  parseCoachingResponse,
  type DanceGenre,
  type CoachingFeedback,
} from "@/engines/coaching-engine";

export type { CoachingFeedback };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function generateAndSaveCoachingFeedback(
  sessionId: string,
  comparisonResult: ComparisonResult,
  genre: DanceGenre
): Promise<CoachingFeedback | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const focusAreas = getCoachingFocusAreas({ comparisonResult, genre });
  const { system, user: userPrompt } = buildCoachingPrompt({
    comparisonResult,
    genre,
  });

  let llmText = "";

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 400,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      llmText = data.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      console.error("OpenAI coaching feedback:", e);
    }
  }

  if (!llmText && anthropicKey) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 400,
          system,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      llmText =
        data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    } catch (e) {
      console.error("Anthropic coaching feedback:", e);
    }
  }

  const feedback = parseCoachingResponse(llmText || "[]", focusAreas);
  if (!llmText) {
    console.warn(
      "[coaching-feedback] No LLM response; using default tips for session",
      sessionId
    );
  }

  const { data: row } = await supabase
    .from("practice_sessions")
    .select("metrics")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!row) return feedback;

  const existingMetrics = (row.metrics as Record<string, unknown>) ?? {};
  const updatedMetrics = {
    ...existingMetrics,
    coaching_feedback: {
      proTips: feedback.proTips,
      focusAreas: feedback.focusAreas,
      generatedAt: feedback.generatedAt,
    },
  };

  await supabase
    .from("practice_sessions")
    .update({ metrics: updatedMetrics })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return feedback;
}
