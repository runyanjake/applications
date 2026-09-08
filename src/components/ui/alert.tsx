import type { ReactNode } from "react";

export type AlertTone = "error" | "warning" | "success" | "info";

const TONES: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-green-200 bg-green-50 text-green-700",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const TITLE_TONES: Record<AlertTone, string> = {
  error: "text-red-800",
  warning: "text-amber-800",
  success: "text-green-800",
  info: "text-indigo-800",
};

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children?: ReactNode;
  /** Buttons rendered under the message. */
  actions?: ReactNode;
  className?: string;
}

export function Alert({
  tone,
  title,
  children,
  actions,
  className = "",
}: AlertProps) {
  return (
    <div
      className={`rounded-md border p-3 text-left text-sm ${TONES[tone]} ${className}`}
    >
      {title && (
        <p className={`mb-1 font-semibold ${TITLE_TONES[tone]}`}>{title}</p>
      )}
      {children}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
