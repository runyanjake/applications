import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { buildUserMessage, parseExtractedJSON } from "./llm-service";
import { getJson, postJson, requireText } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

interface AnthropicResponse {
  content?: { text?: string }[];
}

interface AnthropicModelList {
  data?: { id: string; display_name?: string }[];
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

  private get headers() {
    return {
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
    };
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
        messages: [{ role: "user", content: buildUserMessage(input) }],
      },
      this.headers,
    );

    const text = data.content?.[0]?.text ?? "";
    return parseExtractedJSON(requireText(text, "Anthropic"));
  }

  async listModels(): Promise<LLMModel[]> {
    const data = await getJson<AnthropicModelList>(
      "Anthropic",
      `${this.baseUrl}/v1/models?limit=1000`,
      this.headers,
    );
    // Already newest first, which is the useful order here
    return (data.data ?? []).map((m) => ({ id: m.id, label: m.display_name }));
  }
}
