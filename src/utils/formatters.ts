import type { ApplicationStatus, Currency } from "../types/application";
import { getTimezone } from "./timezone-store";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  CAD: "C$",
  AUD: "A$",
  INR: "\u20B9",
  OTHER: "",
};

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: Currency,
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const fmt = (n: number) =>
    `${symbol}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "—";
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: getTimezone(),
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: getTimezone(),
  });
}

export function formatRelativeDate(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export function formatStatus(status: ApplicationStatus): string {
  return STATUS_LABELS[status];
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  bookmarked: "bg-gray-100 text-gray-700",
  applied: "bg-indigo-100 text-indigo-700",
  interviewing: "bg-yellow-100 text-yellow-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-orange-100 text-orange-700",
  ghosted: "bg-purple-100 text-purple-700",
};

export function statusColor(status: ApplicationStatus): string {
  return STATUS_COLORS[status];
}
