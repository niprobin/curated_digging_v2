"use client";

import Image from "next/image";
import * as React from "react";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import clsx from "clsx";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLikedHistory } from "@/components/history/history-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate, parseSheetDate, formatOrdinalLongDate } from "@/lib/utils";
import type { AlbumEntry } from "@/lib/data";

interface AlbumViewProps {
  entries: AlbumEntry[];
}

type TrackForPlaylist = {
  title: string;
  artist: string;
  url?: string;
  id?: string;
  trackNumber?: number;
  duration?: number;
  explicit?: boolean;
};

const KRAKEN_HOSTS = [
  "kraken.squid.wtf",
  "aether.squid.wtf",
  "triton.squid.wtf",
  "zeus.squid.wtf",
  "wolf.qqdl.site",
  "katze.qqdl.site",
  "maus.qqdl.site",
  "hund.qqdl.site",
] as const;

const ALT_HOSTS = [
  "kraken.squid.wtf",
  "aether.squid.wtf",
  "triton.squid.wtf",
  "zeus.squid.wtf",
  "wolf.qqdl.site",
  "katze.qqdl.site",
  "maus.qqdl.site",
  "hund.qqdl.site",
] as const;

export function AlbumView({ entries }: AlbumViewProps) {
  const {
    state: { timeWindow, showLikedOnly },
  } = useFilters();
  const [pageSize, setPageSize] = React.useState(5);
  const [page, setPage] = React.useState(1);
  const { isLiked, like, unlike } = useLikedHistory();
  const ALBUM_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/album-webhook";
  const [externalLoading, setExternalLoading] = React.useState<Set<string>>(() => new Set());
  const [yamsUrl, setYamsUrl] = React.useState<string | null>(null);
  const [binimumDetails, setBinimumDetails] = React.useState<
    | null
    | {
        artist: string;
        name: string;
        tracks: TrackForPlaylist[];
      }
  >(null);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const [audioInfo, setAudioInfo] = React.useState<{
    url: string;
    title: string;
    artist: string;
  } | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState<number | null>(null);
  // Playlist drawer state (reuse Tracks page behaviour)
  const WEBHOOK_URL = "https://n8n.niprobin.com/webhook/add-to-playlist";
  const PLAYLIST_OPTIONS = [
    "Afrobeat & Highlife",
    "Beats",
    "Bossa Nova",
    "Brazilian Music",
    "Disco Dancefloor",
    "DNB",
    "Downtempo Trip-hop",
    "Funk & Rock",
    "Hip-hop",
    "House Chill",
    "House Dancefloor",
    "Jazz Classic",
    "Jazz Funk",
    "Latin Music",
    "Morning Chill",
    "Neo Soul",
    "Reggae",
    "RNB Mood",
    "Soul Oldies",
  ] as const;
  type PlaylistOption = (typeof PLAYLIST_OPTIONS)[number];
  const [drawerTrack, setDrawerTrack] = React.useState<TrackForPlaylist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<PlaylistOption | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    setCurrentTrackIndex(null);
  }, [binimumDetails]);

  // Simple local persistence for album ratings (1-5)
  const RATINGS_STORAGE_KEY = "curated-digging:album-ratings";
  const [ratings, setRatings] = React.useState<Record<string, number>>({});
  const [openRatingForId, setOpenRatingForId] = React.useState<string | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  // Local remove/dismiss state for albums
  const DISMISSED_STORAGE_KEY = "curated-digging:album-dismissed";
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RATINGS_STORAGE_KEY);
      if (raw) setRatings(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
    } catch {
      // ignore
    }
  }, [ratings]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (raw) setDismissedIds(new Set<string>(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch {
      // ignore
    }
  }, [dismissedIds]);

  React.useEffect(() => {
    if (!openRatingForId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRatingForId(null);
    };
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenRatingForId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [openRatingForId]);

  React.useEffect(() => {
    if (!yamsUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setYamsUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yamsUrl]);

  const filtered = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (dismissedIds.has(entry.id)) {
        return false;
      }
      // Always hide albums already liked
      if (entry.liked) {
        return false;
      }
      // Hide checked albums
      if (entry.checked) {
        return false;
      }
      if (!filterByTimeWindow(entry.addedAt, timeWindow)) {
        return false;
      }
      const liked = isLiked(entry.id, entry.liked) || entry.liked;
      if (showLikedOnly && !liked) {
        return false;
      }
      if (normalizedSearch && !entry.name.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [entries, timeWindow, showLikedOnly, isLiked, dismissedIds, searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [timeWindow, showLikedOnly, entries.length, searchQuery, pageSize]);

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const recomputePageSize = React.useCallback((height: number) => {
    const estimatedRowHeight = 118;
    const rows = Math.floor(height / estimatedRowHeight);
    const clamped = Number.isFinite(rows) ? Math.max(3, Math.min(12, rows)) : 5;
    setPageSize((prev) => (prev === clamped ? prev : clamped));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const el = listRef.current;
    if (!el) {
      const viewport = window.innerHeight || 900;
      recomputePageSize(Math.max(320, viewport - 360));
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      recomputePageSize(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [recomputePageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  React.useEffect(() => {
    const maxPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > maxPages) {
      setPage(maxPages);
    }
  }, [filtered.length, page, pageSize]);

  const handleLike = (entry: AlbumEntry, liked: boolean) => {
    if (liked) {
      like(
        {
          id: entry.id,
          type: "album",
          title: entry.name,
          subtitle: entry.releaseDate,
          url: entry.spotifyUrl,
          artworkUrl: entry.coverUrl,
        },
        entry.liked,
      );
    } else {
      unlike(entry.id, entry.liked);
    }
  };

  const sanitizeQuery = (value: string) => {
    const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleaned = noDiacritics.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned;
  };

  // Kraken (Binimum) can be sensitive to certain special characters.
  // Remove dashes and parentheses as per requested behaviour.
  const sanitizeKrakenQuery = (value: string) => {
    const base = sanitizeQuery(value);
    return base.replace(/[-()]/g, " ").replace(/\s+/g, " ").trim();
  };

  const sanitizeTrackQuery = (value: string) => {
    const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleaned = noDiacritics.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned;
  };

  const fetchAlbumJsonWithFallback = React.useCallback(async (build: (host: string) => string) => {
    let lastErr: unknown = null;
    for (const host of KRAKEN_HOSTS) {
      const url = build(host);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        return (await res.json()) as unknown;
      } catch (error) {
        lastErr = error;
        continue;
      }
    }
    throw lastErr ?? new Error("All album hosts failed");
  }, []);

  function asRecord(u: unknown): Record<string, unknown> | null {
    return typeof u === "object" && u !== null ? (u as Record<string, unknown>) : null;
  }

  function pickString(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
    const v = obj?.[key];
    return typeof v === "string" ? v : undefined;
  }

  const fetchJsonWithFallback = React.useCallback(async (build: (host: string) => string) => {
    let lastErr: unknown = null;
    for (const host of ALT_HOSTS) {
      const url = build(host);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        return (await res.json()) as unknown;
      } catch (error) {
        lastErr = error;
        continue;
      }
    }
    throw lastErr ?? new Error("All hosts failed");
  }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  };

  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const onSeek = (value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(value)) return;
    const next = Math.min(Math.max(0, value), duration || 0);
    el.currentTime = next;
    setCurrentTime(next);
  };
  const fmtTime = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleAddToPlaylist = async () => {
    if (!drawerTrack || !selectedPlaylist) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        playlist: selectedPlaylist,
        artist: drawerTrack.artist,
        track: drawerTrack.title,
        checked: "TRUE",
        liked: "TRUE",
      };
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      setDrawerTrack(null);
      setSelectedPlaylist(null);
    } catch {
      setSubmitError("Could not reach the playlist webhook. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const playDirect = React.useCallback(async (url: string, title: string, artist: string) => {
    try {
      setAudioLoading(true);
      setAudioInfo({ url, title, artist });
      setTimeout(() => {
        try {
          if (audioRef.current) {
            audioRef.current.play().catch(() => setIsPlaying(false));
          }
        } catch {}
      }, 50);
    } finally {
      setAudioLoading(false);
    }
  }, []);

  const playTrack = React.useCallback(
    async (track: TrackForPlaylist, index?: number) => {
      const { artist, title, url: urlHint, id } = track;
      const resolveIndex = () => {
        if (typeof index === "number") return index;
        if (!binimumDetails) return null;
        const idx = binimumDetails.tracks.findIndex((t) => {
          if (track.id && t.id && track.id === t.id) return true;
          return t.title === track.title && t.artist === track.artist;
        });
        return idx >= 0 ? idx : null;
      };
      const resolvedIndex = resolveIndex();
      const finalizeIndex = () => {
        if (resolvedIndex !== null && resolvedIndex >= 0) {
          setCurrentTrackIndex(resolvedIndex);
        } else {
          setCurrentTrackIndex(null);
        }
      };
      const playFromUrl = async (sourceUrl: string, resolvedTitle: string, resolvedArtist: string) => {
        await playDirect(sourceUrl, resolvedTitle, resolvedArtist);
        finalizeIndex();
      };

      if (id) {
        try {
          setAudioLoading(true);
          setAudioInfo(null);
          const trackJson = await fetchJsonWithFallback(
            (host) => `https://${host}/track/?id=${encodeURIComponent(id)}&quality=LOW`,
          );
          const arr = Array.isArray(trackJson) ? trackJson : [trackJson];
          const objs = arr.map((o) => (typeof o === "object" && o !== null ? (o as Record<string, unknown>) : {}));
          const meta = objs.find((o) => typeof o["title"] === "string");
          const urlObj = objs.find(
            (o) => typeof o["OriginalTrackUrl"] === "string" || typeof o["originalURLTrack"] === "string" || typeof o["originalTrackURL"] === "string",
          );
          const url = (urlObj?.["OriginalTrackUrl"] ?? urlObj?.["originalURLTrack"] ?? urlObj?.["originalTrackURL"]) as
            | string
            | undefined;
          const resolvedTitle: string = (meta?.["title"] as string | undefined) ?? title;
          let resolvedArtist: string = artist;
          const artistName = meta?.["artistName"];
          if (typeof artistName === "string") {
            resolvedArtist = artistName;
          } else {
            const artistObj = meta?.["artist"];
            if (artistObj && typeof artistObj === "object") {
              const nameVal = (artistObj as Record<string, unknown>)["name"];
              if (typeof nameVal === "string") resolvedArtist = nameVal;
            }
          }
          if (!url) throw new Error("No streaming URL");
          await playFromUrl(url, resolvedTitle, resolvedArtist);
          return;
        } catch (error) {
          console.error("Failed to fetch streaming URL via id", error);
        } finally {
          setAudioLoading(false);
        }
      }

      if (urlHint) {
        await playFromUrl(urlHint, title, artist);
        return;
      }

      try {
        setAudioLoading(true);
        setAudioInfo(null);
        const q = sanitizeTrackQuery(`${artist} ${title}`);
        const searchJson = await fetchJsonWithFallback(
          (host) => `https://${host}/search/?s=${encodeURIComponent(q)}`,
        );
        const fetchedId: string | undefined = (() => {
          if (searchJson && typeof searchJson === "object") {
            const obj = searchJson as Record<string, unknown>;
            const items = obj["items"];
            if (Array.isArray(items) && items.length > 0) {
              const first = items[0];
              if (first && typeof first === "object") {
                const val = (first as Record<string, unknown>)["id"];
                if (typeof val === "string" || typeof val === "number") return String(val);
              }
            }
          }
          return undefined;
        })();
        if (!fetchedId) throw new Error("No id found");
        const trackJson = await fetchJsonWithFallback(
          (host) => `https://${host}/track/?id=${encodeURIComponent(fetchedId)}&quality=LOW`,
        );
        const arr = Array.isArray(trackJson) ? trackJson : [trackJson];
        const objs = arr.map((o) => (typeof o === "object" && o !== null ? (o as Record<string, unknown>) : {}));
        const meta = objs.find((o) => typeof o["title"] === "string");
        const urlObj = objs.find(
          (o) => typeof o["OriginalTrackUrl"] === "string" || typeof o["originalURLTrack"] === "string" || typeof o["originalTrackURL"] === "string",
        );
        const url = (urlObj?.["OriginalTrackUrl"] ?? urlObj?.["originalURLTrack"] ?? urlObj?.["originalTrackURL"]) as string | undefined;
        const resolvedTitle: string = (meta?.["title"] as string | undefined) ?? title;
        let resolvedArtist: string = artist;
        const artistName = meta?.["artistName"];
        if (typeof artistName === "string") {
          resolvedArtist = artistName;
        } else {
          const artistObj = meta?.["artist"];
          if (artistObj && typeof artistObj === "object") {
            const nameVal = (artistObj as Record<string, unknown>)["name"];
            if (typeof nameVal === "string") resolvedArtist = nameVal;
          }
        }
        if (!url) throw new Error("No streaming URL");
        await playFromUrl(url, resolvedTitle, resolvedArtist);
      } catch (error) {
        console.error("Failed to fetch streaming URL", error);
        setAudioInfo(null);
      } finally {
        setAudioLoading(false);
      }
    },
    [binimumDetails, playDirect, fetchJsonWithFallback],
  );

  const playNextTrack = React.useCallback(() => {
    if (!binimumDetails || binimumDetails.tracks.length === 0) return;
    const current = currentTrackIndex ?? -1;
    const nextIndex = current + 1;
    if (nextIndex < binimumDetails.tracks.length) {
      void playTrack(binimumDetails.tracks[nextIndex], nextIndex);
    } else {
      setCurrentTrackIndex(null);
      setIsPlaying(false);
    }
  }, [binimumDetails, currentTrackIndex, playTrack]);

  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      playNextTrack();
    };
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onLoaded = () => setDuration(el.duration || 0);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [audioInfo, playNextTrack]);

  const setRating = async (entry: AlbumEntry, value: number) => {
    try {
      await fetch(ALBUM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          release_name: entry.name,
          checked: true,
          liked: true,
          rating: value,
        }),
      });
      setRatings((prev) => ({ ...prev, [entry.id]: value }));
      const alreadyLiked = isLiked(entry.id, entry.liked) || entry.liked;
      if (!alreadyLiked) {
        handleLike(entry, true);
      }
    } catch (err) {
      console.error("Failed to send album rating webhook", err);
    } finally {
      setOpenRatingForId(null);
    }
  };

  const handleOpenExternal = async (entry: AlbumEntry) => {
    setExternalLoading((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
    try {
      setBinimumDetails(null);
      const clean = sanitizeKrakenQuery(entry.name);
      const url = `https://yams.tf/#/search/${encodeURIComponent(clean)}`;
      setYamsUrl(url);
    } finally {
      setExternalLoading((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const handleOpenBinimum = async (entry: AlbumEntry) => {
    setExternalLoading((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
    try {
      const q = sanitizeKrakenQuery(entry.name);
      const searchJson = await fetchAlbumJsonWithFallback(
        (host) => `https://${host}/search/?al=${encodeURIComponent(q)}`,
      );
      const id: string | undefined = (() => {
        const root = asRecord(searchJson);
        const albums = asRecord(root?.["albums"]);
        const items = albums?.["items"];
        if (Array.isArray(items) && items.length > 0) {
          const first = asRecord(items[0]);
          const v = first?.["id"];
          if (typeof v === "string" || typeof v === "number") return String(v);
        }
        return undefined;
      })();
      if (id) {
        // Fetch album details and render locally instead of opening external page
        const albumJson = await fetchAlbumJsonWithFallback(
          (host) => `https://${host}/album/?id=${encodeURIComponent(id)}`,
        );
        const metaContainer = Array.isArray(albumJson)
          ? albumJson[0]
          : asRecord(albumJson)?.["0"];
        const tracksContainer = Array.isArray(albumJson)
          ? albumJson[1]
          : asRecord(albumJson)?.["1"];
        const metaRec = asRecord(metaContainer);
        const albumArtist: string =
          pickString(metaRec, "artistName") || pickString(asRecord(metaRec?.["artist"]), "name") || "Unknown artist";
        const albumName: string = pickString(metaRec, "title") || pickString(metaRec, "name") || entry.name;

        const buildTrack = (u: unknown): TrackForPlaylist | null => {
          const rec = asRecord(u);
          if (!rec) return null;
          const title = (rec["title"] || rec["name"]) as unknown;
          if (typeof title !== "string") return null;
          const artist =
            (rec["artistName"] as unknown) || pickString(asRecord(rec["artist"]), "name") || albumArtist;
          const urlCandidate =
            (rec["OriginalTrackUrl"] as unknown) ||
            (rec["originalURLTrack"] as unknown) ||
            (rec["originalTrackURL"] as unknown) ||
            (rec["url"] as unknown);
          const url = typeof urlCandidate === "string" ? urlCandidate : undefined;
          const idVal = rec["id"];
          const id = typeof idVal === "string" || typeof idVal === "number" ? String(idVal) : undefined;
          const durationRaw = rec["duration"];
          const duration =
            typeof durationRaw === "number"
              ? durationRaw
              : typeof durationRaw === "string" && durationRaw.trim() !== ""
                ? Number(durationRaw)
                : undefined;
          const trackNumberRaw = rec["trackNumber"] ?? rec["track_number"];
          const trackNumber =
            typeof trackNumberRaw === "number"
              ? trackNumberRaw
              : typeof trackNumberRaw === "string" && trackNumberRaw.trim() !== ""
                ? Number(trackNumberRaw)
                : undefined;
          const explicitRaw = rec["explicit"];
          const explicit =
            typeof explicitRaw === "boolean"
              ? explicitRaw
              : typeof explicitRaw === "string"
                ? explicitRaw.toLowerCase() === "true"
                : false;
          const normalizedDuration =
            typeof duration === "number" && Number.isFinite(duration) ? duration : undefined;
          const normalizedTrack =
            typeof trackNumber === "number" && Number.isFinite(trackNumber) ? trackNumber : undefined;
          return {
            title,
            artist: typeof artist === "string" ? artist : albumArtist,
            url,
            id,
            duration: normalizedDuration,
            trackNumber: normalizedTrack,
            explicit,
          };
        };

        let tracks: TrackForPlaylist[] = [];
        const itemsMaybe = asRecord(tracksContainer)?.["items"];
        if (Array.isArray(itemsMaybe)) {
          tracks = itemsMaybe
            .map((wrap) => {
              const inner = asRecord(wrap)?.["item"] ?? wrap;
              return buildTrack(inner);
            })
            .filter((t): t is TrackForPlaylist => Boolean(t));
        } else if (Array.isArray(tracksContainer)) {
          tracks = (tracksContainer as unknown[])
            .map((t) => buildTrack(t))
            .filter((t): t is TrackForPlaylist => Boolean(t));
        }
        setBinimumDetails({ artist: albumArtist, name: albumName, tracks });
        setYamsUrl(null);
      } else {
        console.warn("No binimum album id found for", entry.name);
      }
    } catch (err) {
      console.error("Failed to get Binimum link", err);
    } finally {
      setExternalLoading((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const handleDismiss = async (entry: AlbumEntry) => {
    try {
      await fetch(ALBUM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          release_name: entry.name,
          checked: true,
          liked: false,
          rating: null,
        }),
      });
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to send album dismiss webhook", err);
    }
  };

  return (
    <div className="fixed top-0 bottom-0 right-0 left-14 md:left-16 md:flex md:gap-0 md:overflow-hidden">
      <div className="flex h-full w-full flex-col gap-6 overflow-hidden px-4 py-6 md:w-1/2">
        <div className="space-y-3">
          <FilterToolbar />
          <div className="relative">
            <label className="sr-only" htmlFor="album-search">
              Search release name
            </label>
            <input
              id="album-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search release name..."
              className="w-full rounded-md border border-border bg-card p-2 pr-10 text-sm outline-none focus:border-primary"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark" aria-hidden />
              </button>
            )}
          </div>
        </div>
        <div ref={listRef} className="flex flex-1 flex-col overflow-hidden">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              No albums match your filters yet.
            </div>
          ) : (
            <div className="space-y-2">
              {paged.map((entry) => {
            const liked = isLiked(entry.id, entry.liked) || entry.liked;
            const rating = ratings[entry.id] ?? 0;
            const isExternalLoading = externalLoading.has(entry.id);
            const cover = entry.coverUrl ? (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border/70 bg-card md:h-20 md:w-20">
                <Image
                  src={entry.coverUrl}
                  alt={`Artwork for ${entry.name}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground md:h-20 md:w-20">
                <i className="fa-solid fa-compact-disc text-xl" aria-hidden />
              </div>
            );
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border/60 bg-card/30 px-3 py-3 transition hover:bg-card/60"
              >
                <div className="flex items-center gap-3">
                  {cover}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1 text-sm">
                        <h3 className="truncate text-base font-semibold text-foreground">{entry.name}</h3>
                        {entry.releaseDate && (
                          <p className="text-xs text-muted-foreground">
                            Released{" "}
                            <span className="font-medium text-foreground">
                              {formatOrdinalLongDate(parseSheetDate(entry.releaseDate))}
                            </span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">Added {formatRelativeDate(entry.addedAt)}</span>
                          {entry.checked && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Checked</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 text-muted-foreground">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary"
                          title="Open Binimum"
                          onClick={() => handleOpenBinimum(entry)}
                          disabled={isExternalLoading}
                        >
                          <i className="fa-solid fa-play" aria-hidden />
                          <span className="sr-only">Open Binimum</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Search on YAMS.TF"
                          onClick={() => handleOpenExternal(entry)}
                          disabled={isExternalLoading}
                        >
                          <i className="fa-solid fa-magnifying-glass" aria-hidden />
                          <span className="sr-only">Search YAMS.TF</span>
                        </Button>
                        <div className="relative" ref={openRatingForId === entry.id ? popoverRef : null}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-pressed={liked}
                            onClick={() => setOpenRatingForId((id) => (id === entry.id ? null : entry.id))}
                            aria-haspopup="dialog"
                            aria-expanded={openRatingForId === entry.id}
                            title={rating ? `Rated ${rating}/5` : "Rate album"}
                          >
                            <i className={liked ? "fa-solid fa-heart" : "fa-regular fa-heart"} aria-hidden />
                            <span className="sr-only">Rate album</span>
                          </Button>
                          {openRatingForId === entry.id && (
                            <div
                              role="dialog"
                              aria-label="Rate album"
                              className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-border bg-card p-2 shadow-md"
                            >
                              <div className="mb-2 text-xs text-muted-foreground">Rate this album</div>
                              <div className="flex items-center justify-between">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setRating(entry, v)}
                                    className="p-1 text-lg text-foreground hover:text-primary"
                                    aria-label={`Set rating ${v}`}
                                  >
                                    <i
                                      className={v <= (rating || 0) ? "fa-solid fa-star" : "fa-regular fa-star"}
                                      aria-hidden
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => handleDismiss(entry)}
                          title="Dismiss album"
                        >
                          <i className="fa-solid fa-xmark" aria-hidden />
                          <span className="sr-only">Dismiss album</span>
                        </Button>
                      </div>
                    </div>
                    {(rating || liked) && (
                      <div className="text-xs text-muted-foreground">
                        {rating ? (
                          <span className="flex items-center gap-1 text-foreground">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <i key={v} className={v <= rating ? "fa-solid fa-star" : "fa-regular fa-star"} aria-hidden />
                            ))}
                            <span className="ml-1 text-muted-foreground">{rating}/5</span>
                          </span>
                        ) : (
                          <span>You like this</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          )}
        </div>
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
          <div>
            {filtered.length === 0 ? null : (
              <span>
                {Math.min(start + 1, filtered.length)}-{Math.min(end, filtered.length)} of {filtered.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      </div>
      {/* Right pane: show Binimum details (preferred) or external preview */}
      <div className="relative hidden md:flex md:w-1/2 h-full flex-col border-l border-border/60 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {binimumDetails ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{binimumDetails.name}</h2>
                <p className="text-sm text-muted-foreground">{binimumDetails.artist}</p>
              </div>
            {binimumDetails.tracks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
                No tracks available for this album.
              </p>
            ) : (
              <div className="rounded-lg border border-border/70 bg-card/40">
                <div className="divide-y divide-border/60">
                  {binimumDetails.tracks.map((t, idx) => {
                    const isActive = currentTrackIndex === idx;
                    const rowNumber = idx + 1;
                    const durationLabel =
                      typeof t.duration === "number" && Number.isFinite(t.duration) ? fmtTime(t.duration) : null;
                    return (
                      <div
                        key={`${t.id ?? t.title}-${idx}`}
                        className={clsx(
                          "group flex flex-wrap items-center gap-3 px-3 py-2 text-sm transition-colors",
                          "hover:bg-card/70",
                          isActive && "border border-primary/50 bg-primary/10",
                        )}
                        onClick={() => playTrack(t, idx)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            playTrack(t, idx);
                          }
                        }}
                      >
                        <div className="w-6 text-xs font-mono text-muted-foreground">{rowNumber}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-foreground">{t.title}</span>
                            {t.explicit && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                                Explicit
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{t.artist}</span>
                            {durationLabel && (
                              <>
                                <span className="text-muted-foreground">&middot;</span>
                                <span>{durationLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary"
                            title="Play preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTrack(t, idx);
                            }}
                            disabled={audioLoading}
                          >
                            <i className="fa-solid fa-play" aria-hidden />
                            <span className="sr-only">Play</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Add to playlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerTrack({ title: t.title, artist: t.artist, url: t.url, id: t.id });
                              setSelectedPlaylist(null);
                              setSubmitError(null);
                            }}
                          >
                            <i className="fa-solid fa-plus" aria-hidden />
                            <span className="sr-only">Add to playlist</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          ) : yamsUrl ? (
            <iframe title="External" src={yamsUrl} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">No preview</div>
          )}
        </div>
        {/* Sticky bottom audio bar */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2">
            {audioInfo ? (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Add"
                  title="Add"
                  onClick={() => {
                    if (audioInfo) {
                      setDrawerTrack({ title: audioInfo.title, artist: audioInfo.artist });
                      setSelectedPlaylist(null);
                      setSubmitError(null);
                    }
                  }}
                >
                  <i className="fa-solid fa-plus" aria-hidden />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{audioInfo.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{audioInfo.artist}</p>
                </div>
                <div className="flex w-48 items-center gap-2 md:w-72">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{fmtTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={1}
                    value={Math.min(currentTime, duration || 0)}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded bg-border accent-foreground"
                  />
                  <span className="text-[11px] tabular-nums text-muted-foreground">{fmtTime(duration)}</span>
                </div>
                <audio ref={audioRef} src={audioInfo.url} className="hidden" />
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Select a track to play</div>
            )}
          </div>
        </div>
      </div>
      {drawerTrack && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setDrawerTrack(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-playlist-title"
            className="relative ml-auto flex h-full w-full max-w-md flex-col gap-6 bg-background p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-to-playlist-title" className="text-xl font-semibold">
                  Add to playlist
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {drawerTrack.title}
                  <span className="px-2 text-muted-foreground">-</span>
                  {drawerTrack.artist}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerTrack(null)}>
                <i className="fa-solid fa-xmark" aria-hidden />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Select a playlist</p>
              <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
                {PLAYLIST_OPTIONS.map((option) => {
                  const selected = selectedPlaylist === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedPlaylist(option)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card/60 hover:border-primary/60 hover:bg-card",
                      )}
                    >
                      <span className="font-medium">{option.trim()}</span>
                      {selected ? (
                        <i className="fa-solid fa-circle-check text-primary-foreground" aria-hidden />
                      ) : (
                        <i className="fa-regular fa-circle" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {submitError && (
              <p className="rounded-md border border-rose-300/60 bg-rose-50 p-2 text-sm text-rose-900">
                {submitError}
              </p>
            )}
            <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/60 pt-4">
              <Button variant="ghost" onClick={() => setDrawerTrack(null)}>
                Cancel
              </Button>
              <Button onClick={handleAddToPlaylist} disabled={!selectedPlaylist || isSubmitting}>
                {isSubmitting ? "Adding..." : "Add to playlist"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile details or external viewer below content */}
      {binimumDetails ? (
        <div className="relative md:hidden mt-4 p-3">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{binimumDetails.name}</h2>
              <p className="text-sm text-muted-foreground">{binimumDetails.artist}</p>
            </div>
            {audioInfo && (
              <div className="sticky bottom-2 z-50 rounded-md border border-border bg-background/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{audioInfo.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{audioInfo.artist}</p>
                  </div>
                  <audio ref={audioRef} src={audioInfo.url} className="hidden" />
                </div>
              </div>
            )}
            {binimumDetails.tracks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/30 p-3 text-sm text-muted-foreground">
                No tracks available for this album.
              </p>
            ) : (
              <div className="rounded-lg border border-border/70 bg-card/40">
                <div className="divide-y divide-border/60">
                  {binimumDetails.tracks.map((t, idx) => {
                    const isActive = currentTrackIndex === idx;
                    const rowNumber = idx + 1;
                    const durationLabel =
                      typeof t.duration === "number" && Number.isFinite(t.duration) ? fmtTime(t.duration) : null;
                    return (
                      <div
                        key={`${t.id ?? t.title}-mobile-${idx}`}
                        className={clsx(
                          "group flex flex-wrap items-center gap-3 px-3 py-2 text-sm transition-colors",
                          "hover:bg-card/70",
                          isActive && "border border-primary/50 bg-primary/10",
                        )}
                        onClick={() => playTrack(t, idx)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            playTrack(t, idx);
                          }
                        }}
                      >
                        <div className="w-6 text-xs font-mono text-muted-foreground">{rowNumber}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-foreground">{t.title}</span>
                            {t.explicit && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                                Explicit
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{t.artist}</span>
                            {durationLabel && (
                              <>
                                <span className="text-muted-foreground">&middot;</span>
                                <span>{durationLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary"
                            title="Play preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTrack(t, idx);
                            }}
                            disabled={audioLoading}
                          >
                            <i className="fa-solid fa-play" aria-hidden />
                            <span className="sr-only">Play</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Add to playlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerTrack({ title: t.title, artist: t.artist, url: t.url, id: t.id });
                              setSelectedPlaylist(null);
                              setSubmitError(null);
                            }}
                          >
                            <i className="fa-solid fa-plus" aria-hidden />
                            <span className="sr-only">Add to playlist</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        yamsUrl && (
          <div className="relative md:hidden mt-4">
            <div className="h-[60vh] w-full">
              <iframe title="External" src={yamsUrl} className="h-full w-full" />
            </div>
          </div>
        )
      )}
    </div>
  );
}


