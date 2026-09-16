import type { ApplicationFormData } from "../../types/application";
import type { LLMConfig, LLMModel } from "../../types/llm";
import type { LLMService } from "./llm-service";
import { buildUserMessage, parseExtractedJSON } from "./llm-service";
import { getJson, postJson, requireText, sortModels } from "./llm-http";
import systemPrompt from "../../prompts/extract-job-posting.md?raw";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface GeminiModelList {
  models?: {
    name: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }[];
}

export class GeminiLLMService implements LLMService {
  constructor(private readonly config: LLMConfig) {}

  async extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>> {
    const url = `${API_ROOT}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const data = await postJson<GeminiResponse>("Gemini", url, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: buildUserMessage(input) }] }],
      // JSON mode: no code fences or preamble to strip
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseExtractedJSON(requireText(text, "Gemini"));
  }

  async listModels(): Promise<LLMModel[]> {
    const data = await getJson<GeminiModelList>(
      "Gemini",
      `${API_ROOT}/models?pageSize=1000&key=${this.config.apiKey}`,
    );
    // The list includes embedding and other non-chat models
    return sortModels(
      (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => ({
          id: m.name.replace(/^models\//, ""),
          label: m.displayName,
        })),
    );
  }
}
