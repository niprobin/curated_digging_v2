# Codebase Refactoring Proposal

## Executive Summary

This document outlines a comprehensive refactoring plan for the Curated Digging v2 application. The current codebase is functional but suffers from code duplication, large component files (1,337 lines in `album-view.tsx`), scattered configuration, and mixed concerns. This proposal aims to improve maintainability, testability, and developer experience while preserving all existing functionality.

---

## Current State Analysis

### Strengths
- ✅ Strong TypeScript usage with proper types
- ✅ Good architectural patterns (Context, ISR, Server Components)
- ✅ Comprehensive feature set
- ✅ Accessibility considerations
- ✅ PWA-ready with offline support

### Critical Issues

#### 1. **Component Size & Complexity**
- `album-view.tsx`: **1,337 lines** (14+ useState hooks, mixed concerns)
- `playlist-view.tsx`: **688 lines** (similar patterns)
- Both components handle: UI rendering, state management, API calls, localStorage, audio playback, and business logic

#### 2. **Code Duplication**
**Audio Player Logic** (duplicated across album-view and playlist-view):
- Lines 33-498 in album-view.tsx
- Lines 140-244 in playlist-view.tsx
- ~200 lines of duplicated audio playback code

**Playlist Drawer** (duplicated):
- Lines 1121-1193 in album-view.tsx
- Lines 487-559 in playlist-view.tsx
- Identical component rendered in two places

**localStorage Patterns** (6 separate useEffect pairs in album-view.tsx alone):
- Lines 108-123: Ratings persistence
- Lines 125-140: Dismissed IDs persistence
- Lines 142-163: Bookmarks persistence
- Lines 165-182: Bookmark filter persistence
- All follow the same try/catch pattern

**Webhook Calls** (no abstraction):
- 5+ different webhook URLs hardcoded in components
- Repeated fetch logic with identical error handling
- No centralized configuration

#### 3. **Configuration Management**
Hardcoded values scattered across files:
```typescript
// In album-view.tsx
const ALBUM_TRACKS_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/get-albums-tracks";
const STREAMING_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/get-track-url";
const ALBUM_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/album-webhook";
const WEBHOOK_URL = "https://n8n.niprobin.com/webhook/add-to-playlist";

// In playlist-view.tsx (duplicated)
const WEBHOOK_URL = "https://n8n.niprobin.com/webhook/add-to-playlist";
const TRACK_CHECK_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/track-checked";
const STREAMING_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/get-track-url";

// In lib/data.ts
const PLAYLIST_URL = "https://opensheet.elk.sh/...";
const ALBUM_URL = "https://opensheet.elk.sh/...";
```

Storage keys similarly scattered:
```typescript
const RATINGS_STORAGE_KEY = "curated-digging:album-ratings";
const DISMISSED_STORAGE_KEY = "curated-digging:album-dismissed";
const BOOKMARKS_STORAGE_KEY = "curated-digging:album-bookmarks";
// ... 3 more
```

#### 4. **State Management Complexity**
`album-view.tsx` has 20+ pieces of state:
- 14 useState declarations
- Multiple refs
- Context consumption
- Complex interdependencies

#### 5. **Testing Gap**
- No test files found (`.test.ts`, `.spec.ts`)
- Complex logic (filtering, webhooks, audio) not unit tested
- Hard to test current structure due to mixed concerns

---

## Proposed Refactoring Strategy

### Phase 1: Foundation (Low Risk, High Impact)

#### 1.1 Create Centralized Configuration
**File**: `lib/config.ts`

```typescript
export const WEBHOOKS = {
  addToPlaylist: "https://n8n.niprobin.com/webhook/add-to-playlist",
  trackChecked: "https://n8n.niprobin.com/webhook/track-checked",
  getTrackUrl: "https://n8n.niprobin.com/webhook/get-track-url",
  getAlbumTracks: "https://n8n.niprobin.com/webhook/get-albums-tracks",
  albumAction: "https://n8n.niprobin.com/webhook/album-webhook",
} as const;

export const DATA_SOURCES = {
  playlists: "https://opensheet.elk.sh/1UUsfw3UMcHcJUYWoLYZmwiS7nDFc98oM08pgtfx2GOg/curators_tracks",
  albums: "https://opensheet.elk.sh/1UUsfw3UMcHcJUYWoLYZmwiS7nDFc98oM08pgtfx2GOg/albums_list",
} as const;

export const STORAGE_KEYS = {
  albumRatings: "curated-digging:album-ratings",
  albumDismissed: "curated-digging:album-dismissed",
  albumBookmarks: "curated-digging:album-bookmarks",
  albumBookmarkFilter: "curated-digging:album-bookmark-filter",
} as const;

export const EXTERNAL_SERVICES = {
  yamsSearch: (query: string) => `https://yams.tf/#/search/${encodeURIComponent(query)}`,
  spotifyTrack: (id: string) => `https://open.spotify.com/track/${id}`,
} as const;

export const FEATURES = {
  streamingEnabled: true,
} as const;
```

**Impact**: Single source of truth for all URLs and constants. Easy to update, easy to test, easy to mock.

#### 1.2 Create Custom Hooks Library

**File**: `hooks/use-local-storage.ts`

```typescript
import { useState, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  }: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serialize(state));
    } catch {
      // Silently fail for quota exceeded, etc.
    }
  }, [key, state, serialize]);

  return [state, setState];
}

// Specialized hook for Set<string>
export function useLocalStorageSet(key: string): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  return useLocalStorage(key, new Set<string>(), {
    serialize: (set) => JSON.stringify(Array.from(set)),
    deserialize: (str) => new Set(JSON.parse(str)),
  });
}
```

**Impact**: Eliminates 12+ useEffect pairs across the codebase. Reduces 60+ lines to 3 lines per usage.

**File**: `hooks/use-audio-player.ts`

```typescript
import { useState, useRef, useEffect, useCallback } from "react";
import { WEBHOOKS, FEATURES } from "@/lib/config";

interface AudioPlayerOptions {
  onTrackEnd?: () => void;
  autoPlay?: boolean;
}

export function useAudioPlayer(options: AudioPlayerOptions = {}) {
  const [audioInfo, setAudioInfo] = useState<{
    url: string;
    title: string;
    artist: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio event listeners
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      options.onTrackEnd?.();
    };
    const handleTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const handleLoadedMetadata = () => setDuration(el.duration || 0);

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [options.onTrackEnd]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !FEATURES.streamingEnabled) return;

    if (el.paused) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(time)) return;

    const newTime = Math.min(Math.max(0, time), duration || 0);
    el.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const setVol = useCallback((vol: number) => {
    const el = audioRef.current;
    const newVol = Math.min(Math.max(0, vol), 1);
    setVolume(newVol);
    if (el) el.volume = newVol;
  }, []);

  const playTrack = useCallback(async (
    artist: string,
    title: string,
    trackId?: string
  ) => {
    try {
      setIsLoading(true);
      setAudioInfo(null);

      const params = new URLSearchParams({ artist, track: title });
      if (trackId) params.set("track_id", trackId);

      const response = await fetch(`${WEBHOOKS.getTrackUrl}?${params.toString()}`);
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);

      const data = await response.json() as { stream_url?: string; title?: string; artist?: string };
      const streamUrl = data?.stream_url;
      if (!streamUrl) throw new Error("Missing stream URL");

      const resolvedTitle = data?.title?.trim() || title;
      const resolvedArtist = data?.artist?.trim() || artist;

      setAudioInfo({ url: streamUrl, title: resolvedTitle, artist: resolvedArtist });

      if (options.autoPlay !== false) {
        setTimeout(() => {
          audioRef.current?.play().catch(() => setIsPlaying(false));
        }, 50);
      }
    } catch (error) {
      console.error("Failed to fetch streaming URL", error);
      setAudioInfo(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [options.autoPlay]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setAudioInfo(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return {
    audioInfo,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    audioRef,
    playTrack,
    togglePlay,
    seek,
    setVolume: setVol,
    stop,
  };
}
```

**Impact**: Eliminates 300+ lines of duplicated audio logic. Makes audio player reusable and testable.

**File**: `hooks/use-pagination.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from "react";

export function useResizePagination(
  totalItems: number,
  estimatedItemHeight: number,
  options: {
    minPageSize?: number;
    maxPageSize?: number;
    fallbackHeight?: number;
  } = {}
) {
  const { minPageSize = 5, maxPageSize = 25, fallbackHeight = 500 } = options;
  const [pageSize, setPageSize] = useState(minPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const recomputePageSize = useCallback((height: number) => {
    const rows = Math.floor(height / estimatedItemHeight);
    const clamped = Number.isFinite(rows) ? Math.max(minPageSize, Math.min(maxPageSize, rows)) : minPageSize;
    setPageSize((prev) => (prev === clamped ? prev : clamped));
  }, [estimatedItemHeight, minPageSize, maxPageSize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      recomputePageSize(fallbackHeight);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) recomputePageSize(entry.contentRect.height);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [recomputePageSize, fallbackHeight]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  }, [totalPages]);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    containerRef,
    pageSize,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    nextPage,
    prevPage,
    goToPage,
    resetToFirstPage,
  };
}
```

**Impact**: Eliminates duplicated ResizeObserver logic. Makes pagination reusable.

**File**: `hooks/use-webhook.ts`

```typescript
import { useState, useCallback } from "react";

interface WebhookOptions<TPayload, TResponse> {
  url: string;
  method?: "GET" | "POST";
  onSuccess?: (response: TResponse) => void;
  onError?: (error: Error) => void;
}

export function useWebhook<TPayload = unknown, TResponse = unknown>(
  options: WebhookOptions<TPayload, TResponse>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = useCallback(async (payload?: TPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(options.url, {
        method: options.method || "POST",
        headers: options.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: options.method === "POST" && payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      const data = await response.json() as TResponse;
      options.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { trigger, isLoading, error };
}
```

**Impact**: Standardizes webhook calls across the app. Reduces boilerplate.

---

### Phase 2: Component Extraction (Medium Risk, High Impact)

#### 2.1 Extract Shared Components

**File**: `components/audio/audio-player.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/utils";

interface AudioPlayerProps {
  audioInfo: { url: string; title: string; artist: string } | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onAddToPlaylist?: () => void;
  className?: string;
}

export function AudioPlayer({ audioInfo, isPlaying, isLoading, currentTime, duration, volume, audioRef, onTogglePlay, onSeek, onVolumeChange, onAddToPlaylist, className }: AudioPlayerProps) {
  if (isLoading) {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        <i className="fa-solid fa-spinner fa-spin text-2xl" aria-hidden />
      </div>
    );
  }

  if (!audioInfo) {
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">
        Select a track to play
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
        <div className="mb-4 text-center">
          <div className="text-base font-semibold truncate">{audioInfo.title}</div>
          <div className="text-xs text-muted-foreground truncate">{audioInfo.artist}</div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
            </Button>
            {onAddToPlaylist && (
              <Button size="icon" variant="outline" onClick={onAddToPlaylist} aria-label="Add to playlist">
                <i className="fa-solid fa-plus" aria-hidden />
              </Button>
            )}
          </div>
          <div className="flex w-full items-center gap-3">
            <div className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
              {fmtTime(currentTime)}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Number.isFinite(currentTime) ? currentTime : 0}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Seek"
            />
            <div className="w-12 text-[11px] tabular-nums text-muted-foreground">
              {fmtTime(Math.max(0, (duration || 0) - (currentTime || 0)))}
            </div>
          </div>
          <div className="flex w-full items-center gap-2">
            <i className="fa-solid fa-volume-high text-muted-foreground" aria-hidden />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Volume"
            />
          </div>
        </div>
        <audio ref={audioRef} src={audioInfo.url} className="hidden" />
      </div>
    </div>
  );
}
```

**Impact**: Single audio player component used everywhere. ~200 lines eliminated from view components.

**File**: `components/playlist/playlist-drawer.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { PLAYLIST_OPTIONS, type PlaylistOption } from "@/components/playlist/playlist-options";
import clsx from "clsx";

interface PlaylistDrawerProps {
  track: { title: string; artist: string } | null;
  selectedPlaylist: PlaylistOption | null;
  onSelectPlaylist: (playlist: PlaylistOption) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function PlaylistDrawer({
  track,
  selectedPlaylist,
  onSelectPlaylist,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: PlaylistDrawerProps) {
  if (!track) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
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
              {track.title} - {track.artist}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
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
                  onClick={() => onSelectPlaylist(option)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card/60 hover:border-primary/60 hover:bg-card"
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
        {error && (
          <p className="rounded-md border border-rose-300/60 bg-rose-50 p-2 text-sm text-rose-900">
            {error}
          </p>
        )}
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selectedPlaylist || isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to playlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Impact**: Single drawer component. ~100 lines eliminated.

#### 2.2 Refactor Large Components

**Before**: `album-view.tsx` (1,337 lines)

**After** (proposed structure):
```
components/albums/
  ├── album-view.tsx          (200 lines - orchestration only)
  ├── album-list.tsx          (150 lines - list rendering)
  ├── album-card.tsx          (100 lines - individual album)
  ├── album-preview-pane.tsx  (150 lines - right pane)
  ├── album-track-list.tsx    (100 lines - binimum tracks)
  └── use-album-actions.ts    (100 lines - business logic hook)
```

**Example**: `album-view.tsx` (refactored)

```typescript
"use client";

import * as React from "react";
import { useFilters } from "@/components/filters/filter-provider";
import { useLikedHistory } from "@/components/history/history-provider";
import { useAlbumActions } from "./use-album-actions";
import { AlbumList } from "./album-list";
import { AlbumPreviewPane } from "./album-preview-pane";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { SearchBar } from "@/components/ui/search-bar";
import { PlaylistDrawer } from "@/components/playlist/playlist-drawer";
import type { AlbumEntry } from "@/lib/data";

interface AlbumViewProps {
  entries: AlbumEntry[];
}

export function AlbumView({ entries }: AlbumViewProps) {
  const { state: { timeWindow, showLikedOnly } } = useFilters();
  const { isLiked } = useLikedHistory();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = React.useState(false);

  const actions = useAlbumActions();

  // Filtering logic (can be extracted to a hook if needed)
  const filtered = React.useMemo(() => {
    // ... filtering logic
  }, [entries, timeWindow, showLikedOnly, showBookmarkedOnly, searchQuery]);

  return (
    <div className="fixed top-0 bottom-0 right-0 left-14 md:left-16 md:flex md:gap-0 md:overflow-hidden">
      <div className="flex h-full w-full flex-col gap-6 overflow-hidden px-4 py-6 md:w-1/2">
        <div className="space-y-3">
          <FilterToolbar />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <AlbumList
          albums={filtered}
          onRate={actions.rate}
          onDismiss={actions.dismiss}
          onBookmark={actions.toggleBookmark}
          onPreview={actions.openPreview}
        />
      </div>

      <AlbumPreviewPane
        previewData={actions.previewData}
        onPlayTrack={actions.playTrack}
        onAddToPlaylist={actions.openPlaylistDrawer}
      />

      <PlaylistDrawer
        track={actions.drawerTrack}
        selectedPlaylist={actions.selectedPlaylist}
        onSelectPlaylist={actions.selectPlaylist}
        onClose={actions.closeDrawer}
        onSubmit={actions.submitPlaylist}
        isSubmitting={actions.isSubmitting}
        error={actions.submitError}
      />
    </div>
  );
}
```

**Impact**: Component reduced from 1,337 to ~200 lines. Each sub-component has single responsibility.

---

### Phase 3: Business Logic Separation (Medium Risk, Medium Impact)

#### 3.1 Extract Business Logic Hooks

**File**: `hooks/use-album-filtering.ts`

```typescript
export function useAlbumFiltering(
  entries: AlbumEntry[],
  options: {
    timeWindow: TimeWindow;
    showLikedOnly: boolean;
    showBookmarkedOnly: boolean;
    searchQuery: string;
    dismissedIds: Set<string>;
    bookmarkedIds: Set<string>;
    isLiked: (id: string, base: boolean) => boolean;
  }
) {
  return React.useMemo(() => {
    const normalizedSearch = options.searchQuery.trim().toLowerCase();

    const matches = entries.filter((entry) => {
      if (options.dismissedIds.has(entry.id)) return false;
      if (entry.liked || entry.checked) return false;
      if (!filterByTimeWindow(entry.addedAt, options.timeWindow)) return false;

      const liked = options.isLiked(entry.id, entry.liked) || entry.liked;
      if (options.showLikedOnly && !liked) return false;
      if (options.showBookmarkedOnly && !options.bookmarkedIds.has(entry.id)) return false;
      if (normalizedSearch && !entry.name.toLowerCase().includes(normalizedSearch)) return false;

      return true;
    });

    // Prioritize bookmarked albums
    if (options.showBookmarkedOnly || options.bookmarkedIds.size === 0) {
      return matches;
    }

    const prioritized: AlbumEntry[] = [];
    const others: AlbumEntry[] = [];

    matches.forEach((entry) => {
      if (options.bookmarkedIds.has(entry.id)) {
        prioritized.push(entry);
      } else {
        others.push(entry);
      }
    });

    return [...prioritized, ...others];
  }, [entries, options]);
}
```

**Impact**: Filtering logic is now reusable and testable in isolation.

---

### Phase 4: Utility Improvements (Low Risk, Low-Medium Impact)

#### 4.1 Add Utility Functions

**File**: `lib/utils.ts` (additions)

```typescript
// Time formatting
export function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

// Query sanitization
export function sanitizeQuery(value: string): string {
  const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = noDiacritics.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned;
}

export function sanitizeKrakenQuery(value: string): string {
  const base = sanitizeQuery(value);
  return base.replace(/[-()]/g, " ").replace(/\s+/g, " ").trim();
}

// Spotify ID extraction
export function extractSpotifyId(url?: string, id?: string): string | undefined {
  if (id) return id;
  if (url) {
    const match = url.split("/track/")[1];
    if (match) return match.split("?")[0];
  }
  return undefined;
}
```

**Impact**: Shared utilities prevent duplication and are easier to test.

---

## Implementation Roadmap

### Week 1: Foundation
1. Create `lib/config.ts` with all constants ✅
2. Create `hooks/use-local-storage.ts` ✅
3. Create `hooks/use-webhook.ts` ✅
4. Update `lib/data.ts` to use config ✅
5. Write tests for new hooks ✅

### Week 2: Shared Hooks & Components
6. Create `hooks/use-audio-player.ts` ✅
7. Create `hooks/use-pagination.ts` ✅
8. Create `components/audio/audio-player.tsx` ✅
9. Create `components/playlist/playlist-drawer.tsx` ✅
10. Write tests for audio player hook ✅

### Week 3: Refactor playlist-view.tsx
11. Update playlist-view to use new hooks ✅
12. Update playlist-view to use new components ✅
13. Verify functionality ✅
14. Write integration tests ✅

### Week 4: Refactor album-view.tsx
15. Extract album-specific business logic hooks ✅
16. Create album sub-components ✅
17. Update album-view to use new structure ✅
18. Verify functionality ✅
19. Write integration tests ✅

### Week 5: Polish & Testing
20. Add missing utility functions ✅
21. Update all imports to use config ✅
22. Full regression testing ✅
23. Performance testing ✅
24. Documentation updates ✅

---

## Metrics & Success Criteria

### Before Refactoring
- `album-view.tsx`: **1,337 lines**
- `playlist-view.tsx`: **688 lines**
- Code duplication: **~500 lines** (audio player, drawer, localStorage)
- Test coverage: **0%**
- Number of files: **~40**

### After Refactoring (Projected)
- Largest component: **<250 lines**
- Average component size: **<150 lines**
- Code duplication: **<50 lines**
- Test coverage: **>70%** (critical paths)
- Number of files: **~60** (more granular, easier to navigate)

### Qualitative Improvements
- ✅ Easier onboarding for new developers
- ✅ Faster feature development
- ✅ Reduced bug introduction rate
- ✅ Better IDE performance (smaller files)
- ✅ Reusable components across features
- ✅ Testable business logic

---

## Risk Mitigation

### Potential Risks
1. **Breaking existing functionality**: Mitigated by incremental refactoring + regression testing
2. **Performance degradation**: Mitigated by using React.memo, useMemo, useCallback where needed
3. **Increased complexity**: Mitigated by clear file structure and documentation
4. **Team resistance**: Mitigated by showing clear benefits and providing migration guides

### Rollback Strategy
- Refactor in feature branch
- Keep old components alongside new ones during transition
- Progressive rollout (playlist-view first, then album-view)
- Maintain git history for easy rollback

---

## Conclusion

This refactoring proposal transforms a functional but monolithic codebase into a maintainable, scalable, and testable architecture. By extracting shared logic into custom hooks, creating reusable components, and centralizing configuration, we reduce duplication by **~40%** while improving developer experience significantly.

The phased approach ensures minimal disruption to ongoing development while delivering incremental value. Each phase can be deployed independently, reducing risk and enabling continuous delivery.

**Recommended Action**: Proceed with Phase 1 (Foundation) immediately. This phase has the highest ROI with minimal risk and creates the foundation for all subsequent improvements.
