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

/**
 * Format seconds as a time string (M:SS)
 *
 * @param seconds - Number of seconds to format
 * @returns Formatted time string (e.g., "3:45")
 *
 * @example
 * ```ts
 * fmtTime(225) // "3:45"
 * fmtTime(65)  // "1:05"
 * ```
 */
export function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

/**
 * Sanitize a search query by removing diacritics and special characters
 *
 * @param value - The query string to sanitize
 * @returns Cleaned query string
 *
 * @example
 * ```ts
 * sanitizeQuery("Café Tacvba") // "Cafe Tacvba"
 * sanitizeQuery("D'Angelo & The Vanguard") // "D Angelo  The Vanguard"
 * ```
 */
export function sanitizeQuery(value: string): string {
  const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = noDiacritics
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

/**
 * Sanitize a query for Kraken/Binimum API (removes dashes and parentheses)
 *
 * @param value - The query string to sanitize
 * @returns Cleaned query string safe for Kraken API
 *
 * @example
 * ```ts
 * sanitizeKrakenQuery("Artist - Album (Deluxe)") // "Artist Album Deluxe"
 * ```
 */
export function sanitizeKrakenQuery(value: string): string {
  const base = sanitizeQuery(value);
  return base.replace(/[-()]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract Spotify track ID from a URL or return the ID if already provided
 *
 * @param url - Spotify URL (e.g., "https://open.spotify.com/track/abc123?si=...")
 * @param id - Direct Spotify ID
 * @returns The extracted Spotify ID or undefined
 *
 * @example
 * ```ts
 * extractSpotifyId("https://open.spotify.com/track/abc123?si=xyz", undefined) // "abc123"
 * extractSpotifyId(undefined, "abc123") // "abc123"
 * ```
 */
export function extractSpotifyId(url?: string, id?: string): string | undefined {
  if (id) return id;
  if (url) {
    const match = url.split("/track/")[1];
    if (match) return match.split("?")[0];
  }
  return undefined;
}
