import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import { getJson, postJson, requireText, sortModels } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

const OPTIONAL_STRING = { type: ["string", "null"] };

/**
 * Structured-output schema. Strict mode requires every key to be listed as
 * required, so fields the prompt treats as optional are nullable instead;
 * parseExtractedJSON drops the nulls. Ignored by servers without support.
 */
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "job_posting_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        position: OPTIONAL_STRING,
        companyName: OPTIONAL_STRING,
        companyWebsite: OPTIONAL_STRING,
        jobPostingUrl: OPTIONAL_STRING,
        city: OPTIONAL_STRING,
        state: OPTIONAL_STRING,
        country: OPTIONAL_STRING,
        remote: { type: ["boolean", "null"] },
        salaryMin: { type: ["number", "null"] },
        salaryMax: { type: ["number", "null"] },
        currency: {
          type: ["string", "null"],
          enum: ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "OTHER", null],
        },
        notes: { type: "string" },
      },
      required: [
        "position", "companyName", "companyWebsite", "jobPostingUrl", "city",
        "state", "country", "remote", "salaryMin", "salaryMax", "currency",
        "notes",
      ],
      additionalProperties: false,
    },
  },
};

/** OpenAI's list includes image, audio, embedding and moderation models. */
const NON_CHAT_MODEL =
  /embed|whisper|tts|dall-e|image|audio|realtime|transcribe|moderation|search|babbage|davinci/i;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string; reasoning_content?: string } }[];
}

interface ModelList {
  data?: { id: string; owned_by?: string }[];
}

/** LM Studio's native listing, which says whether a model is in memory. */
interface LMStudioModelList {
  data?: { id: string; type?: string; state?: string }[];
}

const looksLikeJson = (text: string) => text.includes("{") && text.includes("}");

/** OpenAI and any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp, ...). */
export class OpenAILLMService implements LLMService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly selfHosted: boolean;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.selfHosted = config.provider === "custom";
    // Self-hosted users supply the full chat endpoint; for OpenAI we build it
    // from the (optionally overridden) API root.
    this.endpoint =
      this.selfHosted && config.baseUrl
        ? config.baseUrl
        : `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;
  }

  private get headers(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>> {
    const data = await postJson<ChatCompletionResponse>(
      "OpenAI",
      this.endpoint,
      {
        ...(this.model && { model: this.model }),
        messages: [
          {
            role: "system",
            // "/no_think" is Qwen's soft switch; only local servers need it
            content: this.selfHosted ? `/no_think\n${systemPrompt}` : systemPrompt,
          },
          { role: "user", content: input },
        ],
        response_format: RESPONSE_FORMAT,
        // api.openai.com rejects unknown parameters, and its reasoning models
        // reject a non-default temperature — keep these to local servers
        ...(this.selfHosted && { temperature: 0, enable_thinking: false }),
      },
      this.headers,
    );

    const message = data.choices?.[0]?.message;
    const content = message?.content ?? "";
    const reasoning = message?.reasoning_content ?? "";
    // Reasoning models sometimes put the answer in reasoning_content and
    // leave content empty or prose-only, so take whichever holds the JSON.
    const text = looksLikeJson(content)
      ? content
      : looksLikeJson(reasoning)
        ? reasoning
        : content || reasoning;

    return parseExtractedJSON(requireText(text, "OpenAI"));
  }

  async listModels(): Promise<LLMModel[]> {
    if (!this.selfHosted) {
      const data = await getJson<ModelList>("OpenAI", this.modelsUrl(), this.headers);
      return sortModels(
        (data.data ?? [])
          .filter((m) => !NON_CHAT_MODEL.test(m.id))
          .map((m) => ({ id: m.id })),
      );
    }

    // LM Studio can say which models are loaded versus merely downloaded.
    // Other servers 404 here and fall through to the standard listing.
    const native = await getJson<LMStudioModelList>(
      "LM Studio",
      new URL("/api/v0/models", this.endpoint).href,
      this.headers,
    ).catch(() => null);
    if (native?.data?.some((m) => m.state)) {
      return sortModels(
        native.data
          .filter((m) => m.type !== "embeddings")
          .map((m) => ({
            id: m.id,
            detail: m.state === "loaded" ? "loaded" : "not loaded",
          })),
      );
    }

    const data = await getJson<ModelList>("Server", this.modelsUrl(), this.headers);
    return sortModels((data.data ?? []).map((m) => ({ id: m.id })));
  }

  /** `…/v1/chat/completions` → `…/v1/models`. */
  private modelsUrl(): string {
    const derived = this.endpoint.replace(/\/chat\/completions\/?$/, "/models");
    return derived !== this.endpoint
      ? derived
      : new URL("/v1/models", this.endpoint).href;
  }
}
