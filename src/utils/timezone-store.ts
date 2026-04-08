const KEY = "jat:timezone";

export function getTimezone(): string {
  try {
    return localStorage.getItem(KEY) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function saveTimezone(tz: string): void {
  localStorage.setItem(KEY, tz);
}

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "UTC",                    label: "UTC" },
  { value: "America/New_York",       label: "Eastern Time (ET)" },
  { value: "America/Chicago",        label: "Central Time (CT)" },
  { value: "America/Denver",         label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles",    label: "Pacific Time (PT)" },
  { value: "America/Anchorage",      label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu",       label: "Hawaii Time (HT)" },
  { value: "America/Toronto",        label: "Toronto (ET)" },
  { value: "America/Vancouver",      label: "Vancouver (PT)" },
  { value: "America/Sao_Paulo",      label: "Brasília (BRT)" },
  { value: "Europe/London",          label: "London (GMT/BST)" },
  { value: "Europe/Paris",           label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin",          label: "Berlin (CET/CEST)" },
  { value: "Europe/Helsinki",        label: "Helsinki (EET/EEST)" },
  { value: "Europe/Moscow",          label: "Moscow (MSK)" },
  { value: "Asia/Dubai",             label: "Dubai (GST)" },
  { value: "Asia/Kolkata",           label: "India (IST)" },
  { value: "Asia/Dhaka",             label: "Dhaka (BST)" },
  { value: "Asia/Bangkok",           label: "Bangkok (ICT)" },
  { value: "Asia/Singapore",         label: "Singapore (SGT)" },
  { value: "Asia/Shanghai",          label: "China (CST)" },
  { value: "Asia/Tokyo",             label: "Japan (JST)" },
  { value: "Asia/Seoul",             label: "Korea (KST)" },
  { value: "Australia/Sydney",       label: "Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland",       label: "Auckland (NZST/NZDT)" },
];
