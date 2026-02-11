import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

export class AnthropicLLMService implements LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    if (!config.baseUrl) {
      throw new Error(
        "Anthropic requires a base URL (CORS proxy). The Anthropic API does not support direct browser requests.",
      );
    }
    this.baseUrl = config.baseUrl;
  }

  async extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: input }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";

    if (!text) throw new Error("Anthropic returned an empty response");

    return parseExtractedJSON(text);
  }
}
