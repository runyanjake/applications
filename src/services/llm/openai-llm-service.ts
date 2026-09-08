import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import { postJson, requireText } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

/** Structured-output schema; ignored by servers that don't support it. */
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "job_posting_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        position:       { type: "string" },
        companyName:    { type: "string" },
        companyWebsite: { type: "string" },
        jobPostingUrl:  { type: "string" },
        city:           { type: "string" },
        state:          { type: "string" },
        country:        { type: "string" },
        remote:         { type: "boolean" },
        salaryMin:      { type: "number" },
        salaryMax:      { type: "number" },
        currency:       { type: "string", enum: ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "OTHER"] },
        notes:          { type: "string" },
      },
      required: ["notes"],
      additionalProperties: false,
    },
  },
};

interface ChatCompletionResponse {
  choices?: { message?: { content?: string; reasoning_content?: string } }[];
}

const looksLikeJson = (text: string) => text.includes("{") && text.includes("}");

/** OpenAI and any OpenAI-compatible endpoint (LM Studio, Ollama, vLLM, ...). */
export class OpenAILLMService implements LLMService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    // Self-hosted users supply the full chat endpoint; for OpenAI we build it
    // from the (optionally overridden) API root.
    this.endpoint =
      config.provider === "custom" && config.baseUrl
        ? config.baseUrl
        : `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;
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
          { role: "user", content: input },
        ],
        temperature: 0,
        enable_thinking: false,
        response_format: RESPONSE_FORMAT,
      },
      this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
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
}
