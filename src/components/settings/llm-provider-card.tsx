import { useState, useEffect } from "react";
import {
  LLM_PROVIDERS,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  type LLMProvider,
  type LLMConfig,
} from "../../types/llm";
import { getLLMConfig, saveLLMConfig, clearLLMConfig } from "../../utils/llm-store";

export function LLMProviderCard() {
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODELS.gemini);
  const [baseUrl, setBaseUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const existing = getLLMConfig();
    if (existing) {
      setProvider(existing.provider);
      setApiKey(existing.apiKey);
      setModel(existing.model);
      setBaseUrl(existing.baseUrl ?? "");
      setConfigured(true);
    }
  }, []);

  const handleProviderChange = (p: LLMProvider) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p]);
    setBaseUrl("");
  };

  const handleSave = () => {
    const config: LLMConfig = {
      provider,
      apiKey,
      model,
      ...(baseUrl && { baseUrl }),
    };
    saveLLMConfig(config);
    setConfigured(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearLLMConfig();
    setProvider("gemini");
    setApiKey("");
    setModel(DEFAULT_MODELS.gemini);
    setBaseUrl("");
    setConfigured(false);
  };

  const isCustom = provider === "custom";
  const showBaseUrl = provider === "anthropic" || provider === "openai" || isCustom;
  const needsBaseUrl = provider === "anthropic" || isCustom;

  const canSave = isCustom
    ? baseUrl.trim().length > 0
    : apiKey.trim().length > 0 && model.trim().length > 0 &&
      (!needsBaseUrl || baseUrl.trim().length > 0);

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        AI Provider
      </h2>

      {configured && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <span className="text-sm text-green-700">
            {PROVIDER_LABELS[provider]} configured
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
            className={inputCls}
          >
            {LLM_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {!isCustom && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={inputCls}
              />
            </div>
          </>
        )}

        {showBaseUrl && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {isCustom ? "Server URL" : "Base URL"}
              {provider === "anthropic" && (
                <span className="ml-1 text-xs font-normal text-red-500">
                  (required)
                </span>
              )}
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === "anthropic"
                  ? "https://your-cors-proxy.example.com"
                  : provider === "custom"
                    ? "http://localhost:1234/v1"
                    : "https://api.openai.com/v1"
              }
              className={inputCls}
            />
            {provider === "anthropic" && (
              <p className="mt-1 text-xs text-gray-500">
                Anthropic's API does not support browser requests (CORS).
                Provide a CORS proxy URL that forwards to api.anthropic.com.
              </p>
            )}
            {provider === "openai" && (
              <p className="mt-1 text-xs text-gray-500">
                Optional. Override to use an OpenAI-compatible endpoint.
              </p>
            )}
            {provider === "custom" && (
              <p className="mt-1 text-xs text-gray-500">
                URL of your OpenAI-compatible server (e.g. LM Studio, Ollama, vLLM).
                Should end with /v1 if your server follows the OpenAI convention.
              </p>
            )}
          </div>
        )}

        {saved && (
          <p className="text-sm text-green-600">Saved!</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Save
          </button>
          {configured && (
            <button
              onClick={handleClear}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
