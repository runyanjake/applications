import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import { postJson, requireText } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

interface AnthropicResponse {
  content?: { text?: string }[];
}

export class AnthropicLLMService implements LLMService {
  private readonly baseUrl: string;

  constructor(private readonly config: LLMConfig) {
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
    const data = await postJson<AnthropicResponse>(
      "Anthropic",
      `${this.baseUrl}/v1/messages`,
      {
        model: this.config.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: input }],
      },
      {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
    );

    const text = data.content?.[0]?.text ?? "";
    return parseExtractedJSON(requireText(text, "Anthropic"));
  }
}
