import type { LLMConfig } from "../types/llm";

const KEY = "jat:llm-config";

export function getLLMConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LLMConfig) : null;
  } catch {
    return null;
  }
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function clearLLMConfig(): void {
  localStorage.removeItem(KEY);
}
