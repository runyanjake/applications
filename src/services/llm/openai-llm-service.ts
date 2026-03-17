import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

const responseFormat = {
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

export class OpenAILLMService implements LLMService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    // For custom/self-hosted providers the user supplies the full endpoint URL
    // (e.g. http://localhost:1234/api/v1/chat). For OpenAI we build it.
    this.endpoint =
      config.provider === "custom" && config.baseUrl
        ? config.baseUrl
        : `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;
  }

  async extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(this.model && { model: this.model }),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        temperature: 0,
        enable_thinking: false,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";

    if (!text) throw new Error("OpenAI returned an empty response");

    return parseExtractedJSON(text);
  }
}
