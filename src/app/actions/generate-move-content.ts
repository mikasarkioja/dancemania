"use server";

/**
 * Generate high-quality description and Teacher Tips for a move using
 * OpenAI or Anthropic API. Falls back to placeholder if no API key is set.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export interface GenerateMoveContentResult {
  description: string;
  teacherTips: string;
  source: "openai" | "anthropic" | "mock";
}

export async function generateMoveDescriptionAndTips(
  moveName: string,
  category: string = ""
): Promise<GenerateMoveContentResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are a professional Salsa and Bachata dance instructor. Write concise, practical content for the dance move registry.`;
  const userPrompt = `Move: "${moveName}"${category ? `\nCategory: ${category}` : ""}\n\nProvide:\n1. A short description (2-3 sentences) for students.\n2. "Teacher tips" (2-4 bullet points) for instructors teaching this move. Format as:\nDESCRIPTION:\n<text>\n\nTEACHER TIPS:\n- tip 1\n- tip 2`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      return parseGeneratedText(text, "openai");
    } catch (e) {
      console.error("OpenAI generate move content:", e);
      return getMockContent(moveName, "openai");
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
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
      return parseGeneratedText(text, "anthropic");
    } catch (e) {
      console.error("Anthropic generate move content:", e);
      return getMockContent(moveName, "anthropic");
    }
  }

  return getMockContent(moveName, "mock");
}

function parseGeneratedText(
  text: string,
  source: "openai" | "anthropic"
): GenerateMoveContentResult {
  let description = "";
  let teacherTips = "";
  const descMatch = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=TEACHER TIPS:|$)/i);
  const tipsMatch = text.match(/TEACHER TIPS:[\s\S]*/i);
  if (descMatch) description = descMatch[1].trim();
  if (tipsMatch)
    teacherTips = tipsMatch[0].replace(/TEACHER TIPS:\s*/i, "").trim();
  if (!description) description = text.slice(0, 300).trim();
  if (!teacherTips)
    teacherTips =
      "• Practice slowly with a partner\n• Focus on connection and frame";
  return { description, teacherTips, source };
}

function getMockContent(
  moveName: string,
  source: "openai" | "anthropic" | "mock"
): GenerateMoveContentResult {
  return {
    description: `${moveName} is a fundamental move in partner dance. Practice the basic step and timing before adding styling.`,
    teacherTips: `• Break down the move into counts\n• Emphasize connection and frame\n• Allow students to practice at half speed first`,
    source,
  };
}
