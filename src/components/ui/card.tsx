import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** The standard bordered white panel used throughout the app. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

interface TitledCardProps extends CardProps {
  title: string;
  description?: string;
}

/** A Card with the settings-page heading treatment. */
export function TitledCard({
  title,
  description,
  children,
  className = "",
}: TitledCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </Card>
  );
}
