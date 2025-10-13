import { parseSheetDate } from "@/lib/utils";

const PLAYLIST_URL = "https://opensheet.elk.sh/19q7ac_1HikdJK_mAoItd65khDHi0pNCR8PrdIcR6Fhc/all_tracks";
const ALBUM_URL = "https://opensheet.elk.sh/1LOx-C1USXeC92Mtv0u6NizEvcTMWkKJNGiNTwAtSj3E/2";

function sanitizeSheetValue(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (upper === "#N/A" || upper === "N/A") return undefined;
  return trimmed;
}

function toBoolean(value?: string | null) {
  return sanitizeSheetValue(value)?.toLowerCase() === "true";
}

export interface PlaylistEntry {
  id: string;
  curator: string;
  artist: string;
  track: string;
  addedAt: Date;
  checked: boolean;
  liked: boolean;
  spotifyUrl?: string;
}

export interface AlbumEntry {
  id: string;
  name: string;
  addedAt: Date;
  releaseDate?: string;
  coverUrl?: string;
  spotifyUrl?: string;
  checked: boolean;
  liked: boolean;
}

type RawPlaylistEntry = {
  spotify_id?: string;
  curator?: string;
  date?: string;
  artist?: string;
  track?: string;
  checked?: string;
  liked?: string;
};

type RawAlbumEntry = {
  release_name?: string;
  added_date?: string;
  release_date?: string;
  cover_url?: string;
  spotify_url?: string;
  checked?: string;
  liked?: string;
};

export async function getPlaylistEntries(): Promise<PlaylistEntry[]> {
  const response = await fetch(PLAYLIST_URL, {
    next: { revalidate: 60 * 30 },
  });
  if (!response.ok) {
    throw new Error("Failed to load playlist data");
  }
  const data = (await response.json()) as RawPlaylistEntry[];
  const occurrences = new Map<string, number>();
  return data
    .map((item, index) => {
      const spotifyId = sanitizeSheetValue(item.spotify_id);
      const curator = sanitizeSheetValue(item.curator) ?? "Unknown curator";
      const artist = sanitizeSheetValue(item.artist) ?? "Unknown artist";
      const track = sanitizeSheetValue(item.track) ?? "Untitled";
      const addedAt = parseSheetDate(item.date ?? "");
      const baseId = spotifyId ?? `${curator}-${track}-${item.date ?? index}-${index}`;
      const seen = occurrences.get(baseId) ?? 0;
      occurrences.set(baseId, seen + 1);
      const id = seen === 0 ? baseId : `${baseId}-${seen}`;
      return {
        id,
        curator,
        artist,
        track,
        addedAt,
        checked: toBoolean(item.checked),
        liked: toBoolean(item.liked),
        spotifyUrl: spotifyId ? `https://open.spotify.com/track/${spotifyId}` : undefined,
      } satisfies PlaylistEntry;
    })
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
}

export async function getAlbumEntries(): Promise<AlbumEntry[]> {
  const response = await fetch(ALBUM_URL, {
    next: { revalidate: 60 * 30 },
  });
  if (!response.ok) {
    throw new Error("Failed to load album data");
  }
  const data = (await response.json()) as RawAlbumEntry[];
  const occurrences = new Map<string, number>();
  return data
    .map((item, index) => {
      const spotifyUrl = sanitizeSheetValue(item.spotify_url);
      const name = sanitizeSheetValue(item.release_name) ?? "Untitled release";
      const releaseDate = sanitizeSheetValue(item.release_date);
      const coverUrl = sanitizeSheetValue(item.cover_url);
      const addedAt = parseSheetDate(item.added_date ?? "");
      const baseId = spotifyUrl ?? `${name}-${item.added_date ?? index}-${index}`;
      const seen = occurrences.get(baseId) ?? 0;
      occurrences.set(baseId, seen + 1);
      const id = seen === 0 ? baseId : `${baseId}-${seen}`;
      return {
        id,
        name,
        addedAt,
        releaseDate,
        coverUrl,
        spotifyUrl,
        checked: toBoolean(item.checked),
        liked: toBoolean(item.liked),
      } satisfies AlbumEntry;
    })
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
}

export function getCurators(entries: PlaylistEntry[]) {
  return Array.from(new Set(entries.map((item) => item.curator))).filter(Boolean);
}
