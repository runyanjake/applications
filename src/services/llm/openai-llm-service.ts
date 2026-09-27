import type { ApplicationFormData } from "../../types/application";
import { REQUIREMENT_CATEGORIES, type LLMConfig, type LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { MAX_OUTPUT_TOKENS, parseExtractedJSON, postingMessage, truncatedError } from "./llm-service";
import { getJson, postJson, requireText, sortModels } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "OTHER"];

const nullable = (type: string) => ({ type: [type, "null"] });

/**
 * Every key required and nullable, in prompt order with the long fields last:
 * optional keys come after required ones in grammar-constrained output, and
 * models closed the object after long notes instead of filling them.
 */
const SCHEMA = {
  type: "object",
  properties: {
    position: { type: "string" },
    companyName: { type: "string" },
    companyWebsite: { type: "string" },
    jobPostingUrl: nullable("string"),
    locations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          city: nullable("string"),
          state: nullable("string"),
          country: nullable("string"),
        },
        required: ["city", "state", "country"],
        additionalProperties: false,
      },
    },
    remote: nullable("boolean"),
    salaryMin: nullable("number"),
    salaryMax: nullable("number"),
    currency: { type: ["string", "null"], enum: [...CURRENCIES, null] },
    summary: { type: "string" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: REQUIREMENT_CATEGORIES },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["category", "items"],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "job_posting_extraction",
    strict: true,
    schema: { ...SCHEMA, required: Object.keys(SCHEMA.properties) },
  },
};

/** OpenAI's list includes image, audio, embedding and moderation models. */
const NON_CHAT_MODEL =
  /embed|whisper|tts|dall-e|image|audio|realtime|transcribe|moderation|search|babbage|davinci/i;

interface ChatCompletionResponse {
  choices?: {
    message?: { content?: string; reasoning_content?: string };
    finish_reason?: string;
  }[];
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
    // Self-hosted: full endpoint given. OpenAI: built from the (overridable) API root.
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
          { role: "system", content: systemPrompt },
          { role: "user", content: postingMessage(input) },
        ],
        response_format: RESPONSE_FORMAT,
        // Local only: OpenAI rejects unknown params and non-default temperature on reasoning models.
        // reasoning_effort "none" disables thinking in LM Studio; vLLM/llama.cpp read chat_template_kwargs.
        ...(this.selfHosted && {
          temperature: 0,
          max_tokens: MAX_OUTPUT_TOKENS,
          reasoning_effort: "none",
          chat_template_kwargs: { enable_thinking: false },
        }),
      },
      this.headers,
    );

    const choice = data.choices?.[0];
    if (choice?.finish_reason === "length") throw truncatedError("OpenAI");
    const message = choice?.message;
    const content = message?.content ?? "";
    const reasoning = message?.reasoning_content ?? "";
    // Reasoning models may answer in reasoning_content; use whichever holds the JSON
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

    // LM Studio lists loaded vs downloaded models; other servers 404 and fall through
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
