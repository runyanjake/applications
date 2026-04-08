import { useState } from "react";
import {
  CURRENCIES,
  INTEREST_LEVELS,
  PRE_INTERVIEW_STATUSES,
  ACTIVE_STATUSES,
  COMPLETE_STATUSES,
  type ApplicationFormData,
} from "../../types/application";
import { formatStatus } from "../../utils/formatters";
import {
  validateApplicationForm,
  hasErrors,
  type ValidationErrors,
} from "../../utils/validators";
import { LLMFillButton } from "./llm-fill-button";

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  initial?: Partial<ApplicationFormData>;
  submitLabel?: string;
  onCancel?: () => void;
}

const EMPTY_FORM: ApplicationFormData = {
  position: "",
  companyName: "",
  companyWebsite: "",
  city: "",
  state: "",
  country: "",
  remote: false,
  salaryMin: null,
  salaryMax: null,
  currency: "USD",
  jobPostingUrl: "",
  interest: "medium",
  status: "bookmarked",
  notes: "",
  dateApplied: new Date().toISOString().slice(0, 10),
};

export function ApplicationForm({ onSubmit, initial, submitLabel, onCancel }: ApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormData>({
    ...EMPTY_FORM,
    ...initial,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof ApplicationFormData>(
    key: K,
    value: ApplicationFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateApplicationForm(form);
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      if (onCancel) {
        onCancel();
      } else {
        setForm({ ...EMPTY_FORM, dateApplied: new Date().toISOString().slice(0, 10) });
        setErrors({});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLLMFill = (data: Partial<ApplicationFormData>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const errorCls = "mt-1 text-xs text-red-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LLMFillButton onFill={handleLLMFill} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Position *
          </label>
          <input
            type="text"
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            className={inputCls}
          />
          {errors.position && <p className={errorCls}>{errors.position}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Company Name *
          </label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            className={inputCls}
          />
          {errors.companyName && (
            <p className={errorCls}>{errors.companyName}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Company Website
          </label>
          <input
            type="url"
            value={form.companyWebsite}
            onChange={(e) => set("companyWebsite", e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
          {errors.companyWebsite && (
            <p className={errorCls}>{errors.companyWebsite}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Job Posting URL
          </label>
          <input
            type="url"
            value={form.jobPostingUrl}
            onChange={(e) => set("jobPostingUrl", e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
          {errors.jobPostingUrl && (
            <p className={errorCls}>{errors.jobPostingUrl}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(e) => set("remote", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Remote</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Salary Min
          </label>
          <input
            type="number"
            value={form.salaryMin ?? ""}
            onChange={(e) =>
              set("salaryMin", e.target.value ? Number(e.target.value) : null)
            }
            className={inputCls}
          />
          {errors.salaryMin && (
            <p className={errorCls}>{errors.salaryMin}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Salary Max
          </label>
          <input
            type="number"
            value={form.salaryMax ?? ""}
            onChange={(e) =>
              set("salaryMax", e.target.value ? Number(e.target.value) : null)
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select
            value={form.currency}
            onChange={(e) =>
              set("currency", e.target.value as ApplicationFormData["currency"])
            }
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status *
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              set(
                "status",
                e.target.value as ApplicationFormData["status"],
              )
            }
            className={inputCls}
          >
            <optgroup label="Pre-Interview">
              {PRE_INTERVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </optgroup>
            <optgroup label="Active">
              {ACTIVE_STATUSES.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </optgroup>
            <optgroup label="Complete">
              {COMPLETE_STATUSES.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Interest *
          </label>
          <select
            value={form.interest}
            onChange={(e) =>
              set(
                "interest",
                e.target.value as ApplicationFormData["interest"],
              )
            }
            className={inputCls}
          >
            {INTEREST_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Date Applied
          </label>
          <input
            type="date"
            value={form.dateApplied}
            onChange={(e) => set("dateApplied", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : (submitLabel ?? "Add Application")}
        </button>
      </div>
    </form>
  );
}
