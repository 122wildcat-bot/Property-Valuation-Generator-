import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./system-prompt";
import type { ValuationInput } from "./schema";

const DEFAULT_MODEL = "claude-opus-4-7";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client = new Anthropic({ apiKey });
  return client;
}

export async function generateReportHtml(input: ValuationInput): Promise<string> {
  const anthropic = getClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userMessage = `Generate the Property Valuation Report HTML for the property below.

Report date to print on the cover page: ${reportDate}

Valuation input (JSON):

${JSON.stringify(input, null, 2)}

Return ONLY the HTML document. Begin with <!DOCTYPE html> and end with </html>. No prose, no code fences.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 16000,
    system: buildSystemPrompt(input.agent),
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return stripCodeFences(text).trim();
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim();
  const fence = /^```(?:html)?\s*\n([\s\S]*?)\n```$/i;
  const m = trimmed.match(fence);
  return m ? m[1] : trimmed;
}
