export const LLM_PROVIDERS = ["gemini", "openai", "anthropic", "custom"] as const;

export type LLMProvider = (typeof LLM_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Self-hosted (OpenAI-compatible)",
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  gemini: "gemini-2.5-flash-lite",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5-20250929",
  custom: "",
};

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** A model reported by the provider's model-listing endpoint. */
export interface LLMModel {
  id: string;
  /** Friendlier name, when the provider supplies one. */
  label?: string;
  /** Short status such as "loaded" / "not loaded" for self-hosted servers. */
  detail?: string;
}
