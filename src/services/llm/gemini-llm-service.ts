import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { parseExtractedJSON } from "./llm-service";
import { postJson, requireText } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class GeminiLLMService implements LLMService {
  constructor(private readonly config: LLMConfig) {}

  async extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const data = await postJson<GeminiResponse>("Gemini", url, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseExtractedJSON(requireText(text, "Gemini"));
  }
}
