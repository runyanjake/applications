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

  // Strip ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Build a safe partial, only keeping known keys with correct types
  const result: Partial<ApplicationFormData> = {};

  if (typeof parsed.position === "string") result.position = parsed.position;
  if (typeof parsed.companyName === "string") result.companyName = parsed.companyName;
  if (typeof parsed.companyWebsite === "string") result.companyWebsite = parsed.companyWebsite;
  if (typeof parsed.city === "string") result.city = parsed.city;
  if (typeof parsed.state === "string") result.state = parsed.state;
  if (typeof parsed.country === "string") result.country = parsed.country;
  if (typeof parsed.remote === "boolean") result.remote = parsed.remote;
  if (typeof parsed.salaryMin === "number") result.salaryMin = parsed.salaryMin;
  if (typeof parsed.salaryMax === "number") result.salaryMax = parsed.salaryMax;
  if (typeof parsed.currency === "string") result.currency = parsed.currency as ApplicationFormData["currency"];

  return result;
}
