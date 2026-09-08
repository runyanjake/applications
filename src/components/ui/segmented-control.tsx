interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Single-select button group (period pickers, report ranges). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) {
  const button =
    size === "sm" ? "px-3 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div
      className={`flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md font-medium transition-colors ${button} ${
            value === option.value
              ? "bg-indigo-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
