import { useState } from "react";
import {
  CURRENCIES,
  INTEREST_LEVELS,
  type ApplicationFormData,
} from "../../types/application";
import { formatInterest } from "../../utils/formatters";
import {
  validateApplicationForm,
  hasErrors,
  type ValidationErrors,
} from "../../utils/validators";
import { Button } from "../ui/button";
import { Field, inputClass } from "../ui/field";
import { StatusOptionGroups } from "./status-options";
import { LLMFillButton } from "./llm-fill-button";

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  initial?: Partial<ApplicationFormData>;
  submitLabel?: string;
  onCancel?: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): ApplicationFormData {
  return {
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
    dateApplied: today(),
  };
}

export function ApplicationForm({
  onSubmit,
  initial,
  submitLabel,
  onCancel,
}: ApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormData>({
    ...emptyForm(),
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
    const validationErrors = validateApplicationForm(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      if (onCancel) {
        onCancel();
      } else {
        setForm(emptyForm());
        setErrors({});
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Text-ish input bound to a string field. */
  const textField = (
    key: Extract<
      keyof ApplicationFormData,
      | "position"
      | "companyName"
      | "companyWebsite"
      | "jobPostingUrl"
      | "city"
      | "state"
      | "country"
    >,
    label: string,
    { type = "text", placeholder }: { type?: string; placeholder?: string } = {},
  ) => (
    <Field label={label} error={errors[key]}>
      <input
        type={type}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
      />
    </Field>
  );

  const salaryField = (
    key: "salaryMin" | "salaryMax",
    label: string,
  ) => (
    <Field label={label} error={errors[key]}>
      <input
        type="number"
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value ? Number(e.target.value) : null)}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <LLMFillButton
        onFill={(data) => setForm((prev) => ({ ...prev, ...data }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {textField("position", "Position *")}
        {textField("companyName", "Company Name *")}
        {textField("companyWebsite", "Company Website", {
          type: "url",
          placeholder: "https://...",
        })}
        {textField("jobPostingUrl", "Job Posting URL", {
          type: "url",
          placeholder: "https://...",
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {textField("city", "City")}
        {textField("state", "State")}
        {textField("country", "Country")}
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
        {salaryField("salaryMin", "Salary Min")}
        {salaryField("salaryMax", "Salary Max")}
        <Field label="Currency">
          <select
            value={form.currency}
            onChange={(e) =>
              set("currency", e.target.value as ApplicationFormData["currency"])
            }
            className={inputClass}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status *" error={errors.status}>
          <select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as ApplicationFormData["status"])
            }
            className={inputClass}
          >
            <StatusOptionGroups />
          </select>
        </Field>

        <Field label="Interest *" error={errors.interest}>
          <select
            value={form.interest}
            onChange={(e) =>
              set("interest", e.target.value as ApplicationFormData["interest"])
            }
            className={inputClass}
          >
            {INTEREST_LEVELS.map((level) => (
              <option key={level} value={level}>
                {formatInterest(level)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date Applied">
          <input
            type="date"
            value={form.dateApplied}
            onChange={(e) => set("dateApplied", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Saving..." : (submitLabel ?? "Add Application")}
        </Button>
      </div>
    </form>
  );
}
