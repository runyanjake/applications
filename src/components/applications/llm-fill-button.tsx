import { useState } from "react";
import type { ApplicationFormData } from "../../types/application";
import { getLLMConfig } from "../../utils/llm-store";
import { createLLMService } from "../../services/llm/llm-service";

interface LLMFillButtonProps {
  onFill: (data: Partial<ApplicationFormData>) => void;
}

const REQUIRED_FIELDS: (keyof ApplicationFormData)[] = ["position", "companyName"];

function describeResult(result: Partial<ApplicationFormData>): {
  filledCount: number;
  missingRequired: string[];
} {
  const filled = Object.keys(result).filter(
    (k) => result[k as keyof ApplicationFormData] != null && result[k as keyof ApplicationFormData] !== "",
  );
  const missingRequired = REQUIRED_FIELDS.filter((f) => !filled.includes(f));
  return { filledCount: filled.length, missingRequired };
}

export function LLMFillButton({ onFill }: LLMFillButtonProps) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const config = getLLMConfig();
  const isConfigured = config !== null;

  const handleExtract = async () => {
    if (!config || !text.trim()) return;

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const service = createLLMService(config);
      const result = await service.extractApplicationData(text.trim());
      const { filledCount, missingRequired } = describeResult(result);

      if (filledCount === 0) {
        setError("The AI returned no usable data. Try rephrasing or check your provider settings.");
        return;
      }

      // Always apply whatever we got
      onFill(result);

      if (missingRequired.length > 0) {
        // Partial fill — keep panel open with a warning so user can review
        setWarning(
          `Filled ${filledCount} field${filledCount !== 1 ? "s" : ""}, but ${missingRequired.join(" and ")} ${missingRequired.length > 1 ? "were" : "was"} not found. You may need to fill ${missingRequired.length > 1 ? "those" : "that"} manually.`,
        );
      } else {
        // Good fill — close
        setText("");
        setShowInput(false);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      console.error("[llm] Extraction failed:", err);
      // Surface a clean message; keep the textarea so the user can retry
      if (raw.toLowerCase().includes("json")) {
        setError("The AI response could not be parsed as JSON. The model may have returned plain text instead of structured data.");
      } else {
        setError(raw);
      }
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
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
              setWarning(null);
            }}
            placeholder="Paste job posting description..."
            disabled={!isConfigured || loading}
            className="mb-2 w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {warning && (
            <div className="mb-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {warning}
            </div>
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
