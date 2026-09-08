import { useState } from "react";
import {
  LLM_PROVIDERS,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  type LLMProvider,
  type LLMConfig,
} from "../../types/llm";
import {
  getLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
} from "../../utils/llm-store";
import { useSavedFlash } from "../../hooks/use-saved-flash";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";
import { Field, inputClass } from "../ui/field";

const CUSTOM_ENDPOINT_PLACEHOLDER = "http://localhost:1234/v1/chat/completions";

/** Per-provider copy for the base URL field. */
const BASE_URL_HELP: Partial<
  Record<LLMProvider, { label: string; placeholder: string; hint: string }>
> = {
  anthropic: {
    label: "Base URL",
    placeholder: "https://your-cors-proxy.example.com",
    hint: "Anthropic's API does not support browser requests (CORS). Provide a CORS proxy URL that forwards to api.anthropic.com.",
  },
  openai: {
    label: "Base URL",
    placeholder: "https://api.openai.com/v1",
    hint: "Optional. Override to use an OpenAI-compatible endpoint.",
  },
  custom: {
    label: "Chat Endpoint URL",
    placeholder: CUSTOM_ENDPOINT_PLACEHOLDER,
    hint: "Full URL to the chat completions endpoint on your server (e.g. LM Studio, Ollama, vLLM).",
  },
};

function blankForm(provider: LLMProvider) {
  return {
    provider,
    apiKey: "",
    model: DEFAULT_MODELS[provider],
    baseUrl: provider === "custom" ? CUSTOM_ENDPOINT_PLACEHOLDER : "",
  };
}

export function LLMProviderCard() {
  const [config, setConfig] = useState(() => {
    const existing = getLLMConfig();
    return existing
      ? { ...existing, baseUrl: existing.baseUrl ?? "" }
      : blankForm("gemini");
  });
  const [configured, setConfigured] = useState(() => getLLMConfig() !== null);
  const { saved, flash } = useSavedFlash();

  const { provider, apiKey, model, baseUrl } = config;
  const isCustom = provider === "custom";
  const baseUrlHelp = BASE_URL_HELP[provider];
  const baseUrlRequired = provider === "anthropic" || isCustom;

  const canSave =
    model.trim().length > 0 &&
    (isCustom || apiKey.trim().length > 0) &&
    (!baseUrlRequired || baseUrl.trim().length > 0);

  const handleSave = () => {
    const next: LLMConfig = {
      provider,
      apiKey,
      model,
      ...(baseUrl && { baseUrl }),
    };
    saveLLMConfig(next);
    setConfigured(true);
    flash();
  };

  const handleClear = () => {
    clearLLMConfig();
    setConfig(blankForm("gemini"));
    setConfigured(false);
  };

  return (
    <TitledCard title="AI Provider">
      {configured && (
        <Alert tone="success" className="mb-4">
          {PROVIDER_LABELS[provider]} configured
        </Alert>
      )}

      <div className="space-y-4">
        <Field label="Provider">
          <select
            value={provider}
            onChange={(e) => setConfig(blankForm(e.target.value as LLMProvider))}
            className={inputClass}
          >
            {LLM_PROVIDERS.map((option) => (
              <option key={option} value={option}>
                {PROVIDER_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>

        {!isCustom && (
          <Field label="API Key">
            <input
              type="password"
              value={apiKey}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              placeholder="Enter your API key"
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Model">
          <input
            type="text"
            value={model}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, model: e.target.value }))
            }
            placeholder={
              isCustom ? "Model name loaded on your server" : undefined
            }
            className={inputClass}
          />
        </Field>

        {baseUrlHelp && (
          <Field
            label={
              <>
                {baseUrlHelp.label}
                {provider === "anthropic" && (
                  <span className="ml-1 text-xs font-normal text-red-500">
                    (required)
                  </span>
                )}
              </>
            }
            hint={baseUrlHelp.hint}
          >
            <input
              type="url"
              value={baseUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
              }
              placeholder={baseUrlHelp.placeholder}
              className={inputClass}
            />
          </Field>
        )}

        {saved && <p className="text-sm text-green-600">Saved!</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
          {configured && (
            <Button variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </TitledCard>
  );
}
