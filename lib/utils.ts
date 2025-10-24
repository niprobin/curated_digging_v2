import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayInMs = 1000 * 60 * 60 * 24;
  if (diff < dayInMs) {
    return "Today";
  }
  if (diff < dayInMs * 2) {
    return "Yesterday";
  }
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const days = Math.round(diff / dayInMs);
  if (days < 30) {
    return formatter.format(-days, "day");
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return formatter.format(-months, "month");
  }
  const years = Math.round(months / 12);
  return formatter.format(-years, "year");
}

export function parseSheetDate(value: string) {
  const normalized = value.trim().replaceAll("/", "-");
  const parts = normalized.split("-");
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      return new Date(year < 100 ? 2000 + year : year, month - 1, day);
    }
  }
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  return new Date();
}

export function formatOrdinalLongDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const suffix = (() => {
    const v = day % 100;
    if (v >= 11 && v <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  })();
  return `${day}${suffix} ${month} ${year}`;
}
