import { useState } from "react";
import type { ApplicationFormData } from "../../types/application";

interface LLMFillButtonProps {
  onFill: (data: Partial<ApplicationFormData>) => void;
}

export function LLMFillButton({ onFill: _onFill }: LLMFillButtonProps) {
  const [showInput, setShowInput] = useState(false);

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
            Paste a job posting URL or description to auto-fill the form.
          </p>
          <textarea
            rows={3}
            placeholder="Paste job posting URL or description..."
            disabled
            className="mb-2 w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <div className="flex items-center gap-2">
            <button
              disabled
              className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white opacity-50"
            >
              Extract Details
            </button>
            <span className="text-xs text-purple-500">
              Coming soon — configure your LLM provider in Settings
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
