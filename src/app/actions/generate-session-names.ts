"use server";

/**
 * Generate 3 boutique-style session names using the naming engine (Creative Director).
 * Uses OpenAI or Anthropic; falls back to mock names when no API key is set.
 */

import {
  buildSessionNamingPrompt,
  parseSessionNames,
  getMockSessionNames,
  type NamingInput,
} from "@/engines/naming-engine";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export interface GenerateSessionNamesResult {
  names: string[];
  source: "openai" | "anthropic" | "mock";
}

export async function generateSessionNames(
  input: NamingInput
): Promise<GenerateSessionNamesResult> {
  const { system, user } = buildSessionNamingPrompt(input);
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
            { role: "user", content: user },
          ],
          max_tokens: 150,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      const names = parseSessionNames(text);
      if (names.length >= 3) {
        return { names: names.slice(0, 3), source: "openai" };
      }
    } catch (e) {
      console.error("OpenAI session names:", e);
    }
  }

  if (anthropicKey) {
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
          max_tokens: 150,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
      const names = parseSessionNames(text);
      if (names.length >= 3) {
        return { names: names.slice(0, 3), source: "anthropic" };
      }
    } catch (e) {
      console.error("Anthropic session names:", e);
    }
  }

  return {
    names: getMockSessionNames(input),
    source: "mock",
  };
}

/**
 * Update a practice session's display name (after user picks or rolls).
 */
export async function updatePracticeSessionName(
  sessionId: string,
  sessionName: string
): Promise<{ success: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_sessions")
    .update({ session_name: sessionName })
    .eq("id", sessionId);
  return { success: !error };
}
