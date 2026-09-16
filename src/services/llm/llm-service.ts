import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import { GeminiLLMService } from "./gemini-llm-service";
import { OpenAILLMService } from "./openai-llm-service";
import { AnthropicLLMService } from "./anthropic-llm-service";
import { createLogger } from "../../utils/logger";

const log = createLogger("llm");

/**
 * Every call is a fresh single-turn chat — the system prompt plus one user
 * message — so no conversation state is kept or resent between requests.
 */
export interface LLMService {
  extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>>;
  /** Models the configured endpoint reports as available. */
  listModels(): Promise<LLMModel[]>;
}

/**
 * The user turn: the posting fenced off from instructions, then the output
 * rule repeated last, where older models pay the most attention to it.
 */
export function buildUserMessage(posting: string): string {
  return `Job posting:\n"""\n${posting}\n"""\n\nRespond with only the JSON object.`;
}

/**
 * Pasted postings carry lots of layout whitespace (indentation, runs of blank
 * lines, non-breaking spaces). None of it helps the model, and it is sent and
 * tokenized on every request.
 */
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

/**
 * Parse the LLM response text into a partial ApplicationFormData object.
 * Strips markdown code fences if the model wraps its response.
 */
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
    // For thinking models that prepend reasoning before the JSON,
    // find the outermost JSON object by scanning from the last closing brace
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

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Keep only known keys that arrived with the expected type
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
    "city",
    "state",
    "country",
    "currency",
    "notes",
  ] as const) {
    copyIfType(key, "string");
  }
  copyIfType("remote", "boolean");
  copyIfType("salaryMin", "number");
  copyIfType("salaryMax", "number");

  log.debug("Parsed result:", result);

  return result;
}
