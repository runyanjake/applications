import type { ApplicationFormData } from "../../types/application";
import { REQUIREMENT_CATEGORIES, type LLMConfig, type LLMModel } from "../../types/llm";
import { GeminiLLMService } from "./gemini-llm-service";
import { OpenAILLMService } from "./openai-llm-service";
import { AnthropicLLMService } from "./anthropic-llm-service";
import { createLogger } from "../../utils/logger";
import { normalizeLocation } from "../../utils/normalize-location";

const log = createLogger("llm");

/** Output cap where thinking is off; the JSON answer needs a few hundred tokens. */
export const MAX_OUTPUT_TOKENS = 2048;

export function truncatedError(provider: string): Error {
  return new Error(
    `${provider} hit its output token limit before finishing. If the model is reasoning, turn thinking off or use a non-reasoning model.`,
  );
}

/** The user turn: the posting alone, tagged so the prompt can refer to it as data. */
export function postingMessage(posting: string): string {
  return `<job_posting>\n${posting}\n</job_posting>`;
}

/** Each call is a stateless single-turn chat: system prompt + one user message. */
export interface LLMService {
  extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>>;
  /** Models the configured endpoint reports as available. */
  listModels(): Promise<LLMModel[]>;
}

/** Collapse layout whitespace from pasted postings; it only costs tokens. */
export function compactWhitespace(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createLLMService(config: LLMConfig): LLMService {
  switch (config.provider) {
    case "gemini":
      return new GeminiLLMService(config);
    case "openai":
    case "custom":
      return new OpenAILLMService(config);
    case "anthropic":
      return new AnthropicLLMService(config);
  }
}

/** Normalize notes to "- " bullets; models vary the marker or omit it. */
export function toBulletList(notes: string): string {
  return notes
    .split(/\n+/)
    .map((line) => line.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ""))
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

/** Summary line, then one "Category: a, b" line per category in the fixed order. */
function buildNotes(summary: unknown, requirements: unknown): string {
  const byCategory = new Map<string, string[]>();
  for (const group of Array.isArray(requirements) ? requirements : []) {
    if (typeof group?.category !== "string" || !Array.isArray(group.items)) continue;
    const items = group.items.filter((i: unknown): i is string => typeof i === "string");
    byCategory.set(group.category, [...(byCategory.get(group.category) ?? []), ...items]);
  }
  const lines = REQUIREMENT_CATEGORIES.flatMap((category) => {
    const items = [...new Set(byCategory.get(category)?.map((i) => i.trim()).filter(Boolean))];
    return items.length > 0 ? [`${category}: ${items.join(", ")}`] : [];
  });
  return toBulletList([typeof summary === "string" ? summary : "", ...lines].join("\n"));
}

/** Parse model output (code fences allowed) into partial form data. */
export function parseExtractedJSON(
  text: string,
): Partial<ApplicationFormData> {
  let cleaned = text.trim();

  // Strip <think>...</think> blocks produced by reasoning/thinking models
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Thinking models prepend reasoning: take the outermost object ending at the last "}"
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) {
      let depth = 0;
      let start = -1;
      for (let i = lastBrace; i >= 0; i--) {
        if (cleaned[i] === "}") depth++;
        else if (cleaned[i] === "{") {
          depth--;
          if (depth === 0) { start = i; break; }
        }
      }
      if (start !== -1) {
        cleaned = cleaned.slice(start, lastBrace + 1).trim();
      }
    }
  }

  log.debug("Raw response:", text);

  // Some models emit a literal "/n" between members: `"a",/n"city"`
  cleaned = cleaned.replace(/([{,])\s*\/n\s*(?=")/g, "$1\n");

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Keep only known keys that arrived with the expected type (nulls drop out)
  const result: Partial<ApplicationFormData> = {};
  const copyIfType = <K extends keyof ApplicationFormData>(
    key: K,
    type: "string" | "number" | "boolean",
  ) => {
    if (typeof parsed[key] === type) {
      result[key] = parsed[key] as ApplicationFormData[K];
    }
  };

  for (const key of [
    "position",
    "companyName",
    "companyWebsite",
    "jobPostingUrl",
    "currency",
  ] as const) {
    copyIfType(key, "string");
  }
  const notes = buildNotes(parsed.summary, parsed.requirements);
  if (notes) result.notes = notes;
  copyIfType("remote", "boolean");
  copyIfType("salaryMin", "number");
  copyIfType("salaryMax", "number");
  // Models name a currency for unpaid postings despite the prompt
  if (result.salaryMin == null && result.salaryMax == null) delete result.currency;
  // One {city, state, country} per place → the sheet's three comma-separated columns
  const locations = (Array.isArray(parsed.locations) ? parsed.locations : [])
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null);
  const column = (key: string) =>
    locations.map((l) => (typeof l[key] === "string" ? l[key] : "")).join(", ");
  Object.assign(
    result,
    normalizeLocation({ city: column("city"), state: column("state"), country: column("country") }),
  );

  log.debug("Parsed result:", result);

  return result;
}
