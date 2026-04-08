import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import { GeminiLLMService } from "./gemini-llm-service";
import { OpenAILLMService } from "./openai-llm-service";
import { AnthropicLLMService } from "./anthropic-llm-service";

export interface LLMService {
  extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>>;
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

  console.log("[LLM] Raw response:", text);

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Build a safe partial, only keeping known keys with correct types
  const result: Partial<ApplicationFormData> = {};

  if (typeof parsed.position === "string") result.position = parsed.position;
  if (typeof parsed.companyName === "string") result.companyName = parsed.companyName;
  if (typeof parsed.companyWebsite === "string") result.companyWebsite = parsed.companyWebsite;
  if (typeof parsed.jobPostingUrl === "string") result.jobPostingUrl = parsed.jobPostingUrl;
  if (typeof parsed.city === "string") result.city = parsed.city;
  if (typeof parsed.state === "string") result.state = parsed.state;
  if (typeof parsed.country === "string") result.country = parsed.country;
  if (typeof parsed.remote === "boolean") result.remote = parsed.remote;
  if (typeof parsed.salaryMin === "number") result.salaryMin = parsed.salaryMin;
  if (typeof parsed.salaryMax === "number") result.salaryMax = parsed.salaryMax;
  if (typeof parsed.currency === "string") result.currency = parsed.currency as ApplicationFormData["currency"];
  if (typeof parsed.notes === "string") result.notes = parsed.notes;

  console.log("[LLM] Parsed result:", result);

  return result;
}
