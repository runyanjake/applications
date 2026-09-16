import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import { getJson, postJson, requireText, sortModels } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "OTHER"];

/** The keys the prompt asks for, and nothing else. */
const FIELDS: Record<string, { type: string; enum?: string[] }> = {
  position: { type: "string" },
  companyName: { type: "string" },
  companyWebsite: { type: "string" },
  jobPostingUrl: { type: "string" },
  city: { type: "string" },
  state: { type: "string" },
  country: { type: "string" },
  remote: { type: "boolean" },
  salaryMin: { type: "number" },
  salaryMax: { type: "number" },
  currency: { type: "string", enum: CURRENCIES },
  notes: { type: "string" },
};

// Must match the "Always include" keys in the prompt
const ALWAYS_PRESENT = ["position", "companyName", "companyWebsite", "notes"];

/**
 * Structured-output schema; it is what actually stops a model inventing keys.
 *
 * OpenAI's strict mode requires every key to be required, so optional fields
 * become nullable there (parseExtractedJSON drops the nulls). Local servers
 * get the plain-typed form that is known to work: after switching them to
 * `type: [..., "null"]`, LM Studio returned unconstrained output with invented
 * keys, so the nullable form was evidently not being enforced there.
 */
function responseFormat(selfHosted: boolean) {
  const properties = Object.fromEntries(
    Object.entries(FIELDS).map(([key, field]) => [
      key,
      selfHosted || ALWAYS_PRESENT.includes(key)
        ? field
        : {
            type: [field.type, "null"],
            ...(field.enum && { enum: [...field.enum, null] }),
          },
    ]),
  );
  return {
    type: "json_schema",
    json_schema: {
      name: "job_posting_extraction",
      strict: true,
      schema: {
        type: "object",
        properties,
        required: selfHosted ? ALWAYS_PRESENT : Object.keys(FIELDS),
        additionalProperties: false,
      },
    },
  };
}

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
        response_format: responseFormat(this.selfHosted),
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
