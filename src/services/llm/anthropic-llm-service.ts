import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { MAX_OUTPUT_TOKENS, parseExtractedJSON, postingMessage, truncatedError } from "./llm-service";
import { getJson, postJson, requireText } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

interface AnthropicResponse {
  content?: { text?: string }[];
  stop_reason?: string;
}

const DEFAULT_BASE_URL = "https://api.anthropic.com";

interface AnthropicModelList {
  data?: { id: string; display_name?: string }[];
}

export class AnthropicLLMService implements LLMService {
  private readonly baseUrl: string;

  constructor(private readonly config: LLMConfig) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
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
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: postingMessage(input) }],
      },
      this.headers,
    );

    if (data.stop_reason === "max_tokens") throw truncatedError("Anthropic");
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
