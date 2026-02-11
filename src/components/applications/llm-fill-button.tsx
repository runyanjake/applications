import { useState } from "react";
import type { ApplicationFormData } from "../../types/application";
import { getLLMConfig } from "../../utils/llm-store";
import { createLLMService } from "../../services/llm/llm-service";

interface LLMFillButtonProps {
  onFill: (data: Partial<ApplicationFormData>) => void;
}

export function LLMFillButton({ onFill }: LLMFillButtonProps) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getLLMConfig();
  const isConfigured = config !== null;

  const handleExtract = async () => {
    if (!config || !text.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const service = createLLMService(config);
      const result = await service.extractApplicationData(text.trim());
      onFill(result);
      setText("");
      setShowInput(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      console.error("[llm] Extraction failed:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowInput(!showInput)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <svg
          className="h-4 w-4 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Auto-fill with AI
      </button>

      {showInput && (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="mb-2 text-sm text-purple-700">
            Paste a job posting description to auto-fill the form.
          </p>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste job posting description..."
            disabled={!isConfigured || loading}
            className="mb-2 w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          {error && (
            <p className="mb-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleExtract}
              disabled={!isConfigured || loading || !text.trim()}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Extracting..." : "Extract Details"}
            </button>
            {!isConfigured && (
              <span className="text-xs text-purple-500">
                Configure your AI provider in Settings
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
