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
import {
  formatRelativeDate,
  parseSheetDate,
  formatOrdinalLongDate,
  sanitizeQuery,
  sanitizeKrakenQuery,
} from "@/lib/utils";
import type { AlbumEntry } from "@/lib/data";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useResizePagination } from "@/hooks/use-pagination";
import { useLocalStorage, useLocalStorageSet, useLocalStorageBoolean } from "@/hooks/use-local-storage";
import { useWebhookGet, useWebhook } from "@/hooks/use-webhook";
import { AudioPlayerBar } from "@/components/audio/audio-player";
import { PlaylistDrawer, type PlaylistDrawerTrack } from "@/components/playlist/playlist-drawer";
import type { PlaylistOption } from "@/components/playlist/playlist-options";
import { WEBHOOKS, EXTERNAL_SERVICES, STORAGE_KEYS, FEATURES } from "@/lib/config";

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

type BinimumDetails = {
  artist: string;
  name: string;
  tracks: TrackForPlaylist[];
};

export function AlbumView({ entries }: AlbumViewProps) {
  const {
    state: { timeWindow, showLikedOnly },
  } = useFilters();
  const { isLiked, like, unlike } = useLikedHistory();

  // Local storage states with custom hooks
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>(STORAGE_KEYS.albumRatings, {});
  const [dismissedIds, setDismissedIds] = useLocalStorageSet(STORAGE_KEYS.albumDismissed);
  const [bookmarkedIds, setBookmarkedIds] = useLocalStorageSet(STORAGE_KEYS.albumBookmarks);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useLocalStorageBoolean(STORAGE_KEYS.albumBookmarkFilter, false);

  // Component state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [externalLoading, setExternalLoading] = React.useState<Set<string>>(() => new Set());
  const [yamsUrl, setYamsUrl] = React.useState<string | null>(null);
  const [binimumDetails, setBinimumDetails] = React.useState<BinimumDetails | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState<number | null>(null);
  const [openRatingForId, setOpenRatingForId] = React.useState<string | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  // Playlist drawer state
  const [drawerTrack, setDrawerTrack] = React.useState<PlaylistDrawerTrack | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<PlaylistOption | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Audio player with track end callback
  const player = useAudioPlayer({
    onTrackEnd: () => {
      if (binimumDetails && binimumDetails.tracks.length > 0) {
        const current = currentTrackIndex ?? -1;
        const nextIndex = current + 1;
        if (nextIndex < binimumDetails.tracks.length) {
          playTrack(binimumDetails.tracks[nextIndex], nextIndex);
        } else {
          setCurrentTrackIndex(null);
        }
      }
    },
  });

  // Webhook for adding to playlist
  const { trigger: addToPlaylist, isLoading: isSubmitting } = useWebhook({
    url: WEBHOOKS.addToPlaylist,
    onSuccess: () => {
      setDrawerTrack(null);
      setSelectedPlaylist(null);
    },
    onError: () => {
      setSubmitError("Could not reach the playlist webhook. Please try again.");
    },
  });

  // Webhook for album actions (rate, dismiss)
  const { trigger: albumAction } = useWebhook({
    url: WEBHOOKS.albumAction,
  });

  // Reset track index when binimum details change
  React.useEffect(() => {
    setCurrentTrackIndex(null);
  }, [binimumDetails]);

  // Filtering logic
  const filtered = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matches = entries.filter((entry) => {
      if (dismissedIds.has(entry.id)) return false;
      if (entry.liked || entry.checked) return false;
      if (!filterByTimeWindow(entry.addedAt, timeWindow)) return false;

      const liked = isLiked(entry.id, entry.liked) || entry.liked;
      if (showLikedOnly && !liked) return false;
      if (showBookmarkedOnly && !bookmarkedIds.has(entry.id)) return false;
      if (normalizedSearch && !entry.name.toLowerCase().includes(normalizedSearch)) return false;

      return true;
    });

    // Prioritize bookmarked albums
    if (showBookmarkedOnly || bookmarkedIds.size === 0) {
      return matches;
    }

    const prioritized: AlbumEntry[] = [];
    const others: AlbumEntry[] = [];
    matches.forEach((entry) => {
      if (bookmarkedIds.has(entry.id)) {
        prioritized.push(entry);
      } else {
        others.push(entry);
      }
    });
    return [...prioritized, ...others];
  }, [entries, timeWindow, showLikedOnly, showBookmarkedOnly, bookmarkedIds, isLiked, dismissedIds, searchQuery]);

  // Pagination with resize hook
  const pagination = useResizePagination(filtered.length, 118, {
    minPageSize: 3,
    maxPageSize: 12,
    fallbackHeight: 540,
  });

  const paged = filtered.slice(pagination.startIndex, pagination.endIndex);

  // Reset pagination when filters change
  React.useEffect(() => {
    pagination.resetToFirstPage();
  }, [timeWindow, showLikedOnly, showBookmarkedOnly, entries.length, searchQuery, pagination.pageSize]);

  // Close rating popover on click outside or Escape
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

  // Close YAMS on Escape
  React.useEffect(() => {
    if (!yamsUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setYamsUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yamsUrl]);

  // Handle like/unlike
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
        entry.liked
      );
    } else {
      unlike(entry.id, entry.liked);
    }
  };

  // Set album rating
  const setRating = async (entry: AlbumEntry, value: number) => {
    try {
      await albumAction({
        release_name: entry.name,
        checked: true,
        liked: true,
        rating: value,
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

  // Toggle bookmark
  const toggleBookmark = (entry: AlbumEntry) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else {
        next.add(entry.id);
      }
      return next;
    });
  };

  // Dismiss album
  const handleDismiss = async (entry: AlbumEntry) => {
    try {
      await albumAction({
        release_name: entry.name,
        checked: true,
        liked: false,
        rating: null,
      });
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
      setBookmarkedIds((prev) => {
        if (!prev.has(entry.id)) return prev;
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to send album dismiss webhook", err);
    }
  };

  // Open YAMS external viewer
  const handleOpenExternal = async (entry: AlbumEntry) => {
    setExternalLoading((prev) => new Set(prev).add(entry.id));
    try {
      setBinimumDetails(null);
      const clean = sanitizeKrakenQuery(entry.name);
      setYamsUrl(EXTERNAL_SERVICES.yamsSearch(clean));
    } finally {
      setExternalLoading((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  // Helper to derive album metadata from name
  const deriveAlbumMeta = (name: string) => {
    const nameParts = name
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);
    if (nameParts.length <= 1) {
      return { albumTitle: name.trim(), albumArtist: null as string | null };
    }
    const albumTitle = nameParts.pop() ?? name;
    const albumArtist = nameParts.join(" - ") || null;
    return { albumTitle, albumArtist };
  };

  // Open Binimum track preview
  const handleOpenBinimum = async (entry: AlbumEntry) => {
    setExternalLoading((prev) => new Set(prev).add(entry.id));
    try {
      const { albumTitle, albumArtist } = deriveAlbumMeta(entry.name);
      const params = {
        album: albumTitle ?? entry.name,
        artist: albumArtist ?? entry.name,
      };

      const response = await fetch(`${WEBHOOKS.getAlbumTracks}?${new URLSearchParams(params).toString()}`);
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);

      const data = (await response.json()) as {
        tracks?: unknown[];
        album?: string;
        artist?: string;
      };

      const normalizedArtist =
        typeof data?.artist === "string" && data.artist.trim() ? data.artist.trim() : albumArtist ?? "Unknown artist";
      const normalizedAlbum =
        typeof data?.album === "string" && data.album.trim() ? data.album.trim() : albumTitle ?? entry.name;

      const normalizeTrack = (raw: unknown): TrackForPlaylist | null => {
        const rec = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
        if (!rec) return null;

        const titleCandidate = rec["title"] ?? rec["name"];
        if (typeof titleCandidate !== "string" || !titleCandidate.trim()) return null;

        const artistCandidate = rec["artist"] ?? rec["artistName"];
        const artistLabel = (typeof artistCandidate === "string" && artistCandidate.trim()) || normalizedArtist;

        const urlCandidate = rec["stream_url"] ?? rec["url"];
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

        return {
          title: titleCandidate.trim(),
          artist: artistLabel,
          url,
          id,
          duration: typeof duration === "number" && Number.isFinite(duration) ? duration : undefined,
          trackNumber: typeof trackNumber === "number" && Number.isFinite(trackNumber) ? trackNumber : undefined,
          explicit,
        };
      };

      const tracks = Array.isArray(data?.tracks)
        ? data!.tracks.map((track) => normalizeTrack(track)).filter((t): t is TrackForPlaylist => Boolean(t))
        : [];

      setBinimumDetails({ artist: normalizedArtist, name: normalizedAlbum, tracks });
      setYamsUrl(null);
    } catch (err) {
      console.error("Failed to load album tracks", err);
    } finally {
      setExternalLoading((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  // Play track from Binimum
  const playTrack = async (track: TrackForPlaylist, index?: number) => {
    try {
      await player.playTrack(track.artist, track.title, track.id);
      const resolvedIndex =
        typeof index === "number"
          ? index
          : binimumDetails
            ? binimumDetails.tracks.findIndex((t) => {
                if (track.id && t.id && track.id === t.id) return true;
                return t.title === track.title && t.artist === track.artist;
              })
            : -1;
      setCurrentTrackIndex(resolvedIndex >= 0 ? resolvedIndex : null);
    } catch (error) {
      console.error("Failed to play track", error);
      setCurrentTrackIndex(null);
    }
  };

  // Handle adding track to playlist
  const handleAddToPlaylist = async () => {
    if (!drawerTrack || !selectedPlaylist) return;
    await addToPlaylist({
      playlist: selectedPlaylist,
      artist: drawerTrack.artist,
      track: drawerTrack.title,
      checked: "TRUE",
      liked: "TRUE",
    });
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
            <Button
              size="sm"
              variant={showBookmarkedOnly ? "secondary" : "outline"}
              className="gap-2"
              aria-pressed={showBookmarkedOnly}
              onClick={() => setShowBookmarkedOnly((prev) => !prev)}
            >
              <i className={showBookmarkedOnly ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} aria-hidden />
              {showBookmarkedOnly ? "Showing bookmarked" : "Show bookmarked only"}
            </Button>
            <span className="text-[11px] uppercase tracking-wide">{bookmarkedIds.size} bookmarked</span>
          </div>
        </div>

        <div ref={pagination.containerRef} className="flex flex-1 flex-col overflow-hidden">
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
                const isBookmarked = bookmarkedIds.has(entry.id);
                const { albumTitle, albumArtist } = deriveAlbumMeta(entry.name);

                const cover = entry.coverUrl ? (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border/70 bg-card md:h-20 md:w-20">
                    <Image src={entry.coverUrl} alt={`Artwork for ${entry.name}`} fill className="object-cover" sizes="96px" />
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
                            <h3 className="truncate text-base font-semibold text-foreground">{albumTitle}</h3>
                            {albumArtist && <p className="truncate text-[13px] text-muted-foreground">{albumArtist}</p>}
                            <div className="space-y-0.5 text-[11px] text-muted-foreground opacity-80">
                              {entry.releaseDate && (
                                <p>
                                  Released{" "}
                                  <span className="font-medium text-foreground/90">
                                    {formatOrdinalLongDate(parseSheetDate(entry.releaseDate))}
                                  </span>
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="capitalize">Added {formatRelativeDate(entry.addedAt)}</span>
                                {entry.checked && (
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Checked</span>
                                )}
                                {isBookmarked && (
                                  <Badge variant="secondary" className="border border-amber-200 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                    Bookmarked
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1 text-muted-foreground">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary"
                              title="Preview tracks"
                              onClick={() => handleOpenBinimum(entry)}
                              disabled={isExternalLoading}
                            >
                              <i className="fa-solid fa-play" aria-hidden />
                              <span className="sr-only">Preview tracks</span>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className={clsx(isBookmarked && "text-amber-600 hover:text-amber-600")}
                              aria-pressed={isBookmarked}
                              title={isBookmarked ? "Remove bookmark" : "Bookmark album"}
                              onClick={() => toggleBookmark(entry)}
                            >
                              <i className={isBookmarked ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} aria-hidden />
                              <span className="sr-only">{isBookmarked ? "Remove bookmark" : "Bookmark album"}</span>
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
                                        <i className={v <= (rating || 0) ? "fa-solid fa-star" : "fa-regular fa-star"} aria-hidden />
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

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
            <div>
              <span>
                {Math.min(pagination.startIndex + 1, filtered.length)}-{Math.min(pagination.endIndex, filtered.length)}{" "}
                of {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={pagination.prevPage} disabled={pagination.currentPage <= 1}>
                Prev
              </Button>
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button variant="ghost" size="sm" onClick={pagination.nextPage} disabled={pagination.currentPage >= pagination.totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right pane: Binimum details or YAMS external viewer */}
      <div className="relative hidden md:flex md:w-1/2 h-full flex-col border-l border-border/60 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {binimumDetails ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{binimumDetails.name}</h2>
                <p className="text-sm text-muted-foreground">{binimumDetails.artist}</p>
              </div>
              {!FEATURES.streamingEnabled && (
                <p className="rounded-md border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                  Streaming previews are temporarily unavailable due to API changes.
                </p>
              )}
              {binimumDetails.tracks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
                  No tracks available for this album.
                </p>
              ) : (
                <div className="rounded-lg border border-border/70 bg-card/40">
                  <div className="divide-y divide-border/60">
                    {binimumDetails.tracks.map((t, idx) => {
                      const isActive = currentTrackIndex === idx;
                      return (
                        <div
                          key={`${t.id ?? t.title}-${idx}`}
                          className={clsx(
                            "group flex flex-wrap items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-card/70",
                            isActive && "border border-primary/50 bg-primary/10"
                          )}
                          onClick={FEATURES.streamingEnabled ? () => playTrack(t, idx) : undefined}
                          role={FEATURES.streamingEnabled ? "button" : undefined}
                          tabIndex={FEATURES.streamingEnabled ? 0 : -1}
                        >
                          <div className="w-6 text-xs font-mono text-muted-foreground">{idx + 1}</div>
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
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary"
                              title={FEATURES.streamingEnabled ? "Play preview" : "Streaming temporarily unavailable"}
                              onClick={
                                FEATURES.streamingEnabled
                                  ? (e) => {
                                      e.stopPropagation();
                                      playTrack(t, idx);
                                    }
                                  : undefined
                              }
                              disabled={!FEATURES.streamingEnabled || player.isLoading}
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
                                setDrawerTrack({ title: t.title, artist: t.artist });
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
          {FEATURES.streamingEnabled ? (
            player.audioInfo ? (
              <AudioPlayerBar
                audioInfo={player.audioInfo}
                isPlaying={player.isPlaying}
                audioRef={player.audioRef}
                onTogglePlay={player.togglePlay}
                onSeek={player.seek}
                currentTime={player.currentTime}
                duration={player.duration}
                onAddToPlaylist={() => {
                  if (player.audioInfo) {
                    setDrawerTrack({ title: player.audioInfo.title, artist: player.audioInfo.artist });
                    setSelectedPlaylist(null);
                    setSubmitError(null);
                  }
                }}
              />
            ) : (
              <div className="px-4 py-2 text-xs text-muted-foreground">Select a track to play</div>
            )
          ) : (
            <div className="px-4 py-2 text-xs text-muted-foreground">
              Streaming previews are temporarily unavailable due to API changes.
            </div>
          )}
        </div>
      </div>

      {/* Playlist drawer */}
      <PlaylistDrawer
        track={drawerTrack}
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={setSelectedPlaylist}
        onClose={() => {
          setDrawerTrack(null);
          setSelectedPlaylist(null);
          setSubmitError(null);
        }}
        onSubmit={handleAddToPlaylist}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </div>
  );
}
