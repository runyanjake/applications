import { useState } from "react";
import {
  LLM_PROVIDERS,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  type LLMProvider,
  type LLMConfig,
  type LLMModel,
} from "../../types/llm";
import { createLLMService } from "../../services/llm/llm-service";
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

/** Select value that switches the model picker back to free text. */
const MANUAL_ENTRY = "__manual__";

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
    hint: "Full URL to the chat completions endpoint on your server (e.g. LM Studio, vLLM, llama.cpp).",
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
  const [models, setModels] = useState<LLMModel[] | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const { provider, apiKey, model, baseUrl } = config;
  const isCustom = provider === "custom";
  const baseUrlHelp = BASE_URL_HELP[provider];
  const baseUrlRequired = provider === "anthropic" || isCustom;

  const canSave =
    model.trim().length > 0 &&
    (isCustom || apiKey.trim().length > 0) &&
    (!baseUrlRequired || baseUrl.trim().length > 0);

  // Listing needs the same credentials a request would, minus the model
  const canDiscover =
    (isCustom || apiKey.trim().length > 0) &&
    (!baseUrlRequired || baseUrl.trim().length > 0);

  const resetDiscovery = () => {
    setModels(null);
    setDiscoveryError(null);
  };

  /** Ask the provider which models it offers, using the unsaved form values. */
  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveryError(null);
    try {
      const found = await createLLMService({
        provider,
        apiKey,
        model,
        ...(baseUrl && { baseUrl }),
      }).listModels();
      if (found.length === 0) {
        setModels(null);
        setDiscoveryError("The provider reported no models.");
        return;
      }
      setModels(found);
      // Nothing chosen yet (self-hosted starts blank): take the first loaded one
      if (!model.trim()) {
        const pick = found.find((m) => m.detail === "loaded") ?? found[0]!;
        setConfig((prev) => ({ ...prev, model: pick.id }));
      }
    } catch (err) {
      setModels(null);
      setDiscoveryError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscovering(false);
    }
  };

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
    resetDiscovery();
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
            onChange={(e) => {
              setConfig(blankForm(e.target.value as LLMProvider));
              resetDiscovery();
            }}
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

        <Field
          label="Model"
          error={discoveryError ?? undefined}
          hint={
            models
              ? `${models.length} model${models.length === 1 ? "" : "s"} available from ${PROVIDER_LABELS[provider]}.`
              : "Use Discover to list the models your key or server can use."
          }
        >
          <div className="flex gap-2">
            {models ? (
              <select
                value={model}
                onChange={(e) => {
                  if (e.target.value === MANUAL_ENTRY) setModels(null);
                  else setConfig((prev) => ({ ...prev, model: e.target.value }));
                }}
                className={inputClass}
              >
                {/* Keep a saved model selectable even if the list lacks it */}
                {model && !models.some((m) => m.id === model) && (
                  <option value={model}>{model} (not listed)</option>
                )}
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label && m.label !== m.id ? `${m.label} (${m.id})` : m.id}
                    {m.detail ? ` — ${m.detail}` : ""}
                  </option>
                ))}
                <option value={MANUAL_ENTRY}>Enter a model name manually…</option>
              </select>
            ) : (
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
            )}
            <Button
              variant="secondary"
              onClick={handleDiscover}
              disabled={!canDiscover || discovering}
              className="whitespace-nowrap"
            >
              {discovering ? "Loading…" : models ? "Refresh" : "Discover"}
            </Button>
          </div>
        </Field>

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
