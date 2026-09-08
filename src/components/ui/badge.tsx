import type { ReactNode } from "react";

/** Pill label. `tone` is a Tailwind bg/text class pair. */
export function Badge({
  tone,
  className = "",
  children,
}: {
  tone: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}
    >
      {children}
    </span>
  );
}
