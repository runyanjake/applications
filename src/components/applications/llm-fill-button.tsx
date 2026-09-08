import { useState } from "react";
import type { ApplicationFormData } from "../../types/application";
import { getLLMConfig } from "../../utils/llm-store";
import { createLLMService } from "../../services/llm/llm-service";
import { createLogger } from "../../utils/logger";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { SparkIcon } from "../ui/icons";

const log = createLogger("llm");

const REQUIRED_FIELDS: (keyof ApplicationFormData)[] = [
  "position",
  "companyName",
];

function describeResult(result: Partial<ApplicationFormData>) {
  const filled = REQUIRED_FIELDS.filter(
    (field) => result[field] != null && result[field] !== "",
  );
  return {
    filledCount: Object.values(result).filter(
      (value) => value != null && value !== "",
    ).length,
    missingRequired: REQUIRED_FIELDS.filter((f) => !filled.includes(f)),
  };
}

function partialFillMessage(
  filledCount: number,
  missing: (keyof ApplicationFormData)[],
): string {
  const plural = missing.length > 1;
  return `Filled ${filledCount} field${filledCount !== 1 ? "s" : ""}, but ${missing.join(
    " and ",
  )} ${plural ? "were" : "was"} not found. You may need to fill ${
    plural ? "those" : "that"
  } manually.`;
}

export function LLMFillButton({
  onFill,
}: {
  onFill: (data: Partial<ApplicationFormData>) => void;
}) {
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
      const result = await createLLMService(config).extractApplicationData(
        text.trim(),
      );
      const { filledCount, missingRequired } = describeResult(result);

      if (filledCount === 0) {
        setError(
          "The AI returned no usable data. Try rephrasing or check your provider settings.",
        );
        return;
      }

      onFill(result);

      if (missingRequired.length > 0) {
        // Partial fill — leave the panel open so the user can review
        setWarning(partialFillMessage(filledCount, missingRequired));
      } else {
        setText("");
        setShowInput(false);
      }
    } catch (err) {
      log.error("Extraction failed:", err);
      const raw = err instanceof Error ? err.message : String(err);
      setError(
        raw.toLowerCase().includes("json")
          ? "The AI response could not be parsed as JSON. The model may have returned plain text instead of structured data."
          : raw,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="secondary" onClick={() => setShowInput(!showInput)}>
        <SparkIcon className="h-4 w-4 text-purple-500" />
        Auto-fill with AI
      </Button>

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
            <Alert tone="error" className="mb-2">
              {error}
            </Alert>
          )}
          {warning && (
            <Alert tone="warning" className="mb-2">
              {warning}
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              onClick={handleExtract}
              disabled={!isConfigured || loading || !text.trim()}
            >
              {loading ? "Extracting..." : "Extract Details"}
            </Button>
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
