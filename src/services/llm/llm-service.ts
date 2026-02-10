import type { ApplicationFormData } from "../../types/application";

export interface LLMService {
  extractApplicationData(
    input: string,
  ): Promise<Partial<ApplicationFormData>>;
}

export class StubLLMService implements LLMService {
  async extractApplicationData(
    _input: string,
  ): Promise<Partial<ApplicationFormData>> {
    // Stub: will be replaced with Gemini/Claude/ChatGPT integration
    return {};
  }
}

export function createLLMService(): LLMService {
  return new StubLLMService();
}
