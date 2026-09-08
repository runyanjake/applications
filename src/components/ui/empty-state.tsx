import type { ReactNode } from "react";
import { DocumentIcon } from "./icons";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <DocumentIcon className="mb-4 h-16 w-16 text-gray-300" />
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action}
    </div>
  );
}
