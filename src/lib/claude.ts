import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./system-prompt";
import type { ValuationInput } from "./schema";

// Sonnet 4.6 is significantly faster than Opus on long-form generation
// while producing equally good template-following HTML for this report
// shape. Opus runs were consistently 60-120s longer end-to-end and
// pushing PVRG past MVE's timeout cap. Override via env if you want
// Opus quality on a one-off basis.
const DEFAULT_MODEL = "claude-sonnet-4-6";

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

  // Strip the heavyweight headshot data URL from the payload before sending
  // to Claude. A 1 MB JPEG is ~1.3 MB of base64 (>300K tokens); if Claude
  // inlines it verbatim into the HTML output, even a 16K-token cap gets
  // shredded mid-cover-page and the rest of the report never gets written.
  // The system prompt instructs Claude to use the placeholder string below
  // for the <img src=...>; we substitute it back to the real data URL after
  // the response comes in.
  const headshotDataUrl = input.agent?.headshot_data_url;
  const inputForClaude: ValuationInput = headshotDataUrl
    ? {
        ...input,
        agent: { ...input.agent!, headshot_data_url: undefined } as ValuationInput["agent"],
      }
    : input;

  const userMessage = `Generate the Property Valuation Report HTML for the property below.

Report date to print on the cover page: ${reportDate}

Valuation input (JSON):

${JSON.stringify(inputForClaude, null, 2)}

Return ONLY the HTML document. Begin with <!DOCTYPE html> and end with </html>. No prose, no code fences.`;

  // Prompt caching on the system prompt: the prompt is ~4 KB and stable
  // per-agent, so a 5-minute ephemeral cache gives subsequent calls
  // (back-to-back report regenerations, retries) a meaningful speedup
  // and a 90% cost discount on the cached tokens.
  const systemPrompt = buildSystemPrompt(input.agent);
  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 12000,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });
  const elapsedMs = Date.now() - t0;
  const u = response.usage;
  console.log(
    `[claude] model=${model} elapsed=${elapsedMs}ms stop=${response.stop_reason} ` +
      `input=${u.input_tokens} output=${u.output_tokens} ` +
      `cache_read=${u.cache_read_input_tokens ?? 0} ` +
      `cache_create=${u.cache_creation_input_tokens ?? 0}`,
  );

  let text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  text = stripCodeFences(text).trim();

  // Substitute the placeholder with the real headshot data URL. Using a
  // simple string replace (not regex) so we don't have to escape the URL.
  if (headshotDataUrl) {
    text = text.split("__AGENT_HEADSHOT_DATA_URL__").join(headshotDataUrl);
  }

  return text;
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim();
  const fence = /^```(?:html)?\s*\n([\s\S]*?)\n```$/i;
  const m = trimmed.match(fence);
  return m ? m[1] : trimmed;
}
