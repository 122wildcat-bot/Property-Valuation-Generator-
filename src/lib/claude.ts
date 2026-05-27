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
  // maxRetries=0: don't silently retry on slow / overloaded responses.
  // The route handler has its own 300s budget and the calling MVE has its
  // own retry policy — letting the SDK retry on top of that turns a 60s
  // hiccup into a 3-minute wall-time stall.
  client = new Anthropic({ apiKey, maxRetries: 0 });
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

  // Prompt caching on the system prompt: the prompt is ~4 KB and stable
  // per-agent, so a 5-minute ephemeral cache gives subsequent calls
  // (back-to-back report regenerations, retries) a meaningful speedup
  // and a 90% cost discount on the cached tokens.
  const systemPrompt = buildSystemPrompt(input.agent);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 12000,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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
