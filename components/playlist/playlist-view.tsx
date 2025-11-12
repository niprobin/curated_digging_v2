"use client";

import * as React from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate } from "@/lib/utils";
import type { PlaylistEntry } from "@/lib/data";

interface PlaylistViewProps {
  entries: PlaylistEntry[];
  curators: string[];
}

const WEBHOOK_URL = "https://n8n.niprobin.com/webhook/add-to-playlist";
const TRACK_CHECK_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/track-checked";

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

function extractSpotifyId(entry: PlaylistEntry) {
  if (entry.spotifyId) return entry.spotifyId;
  if (entry.spotifyUrl) {
    const match = entry.spotifyUrl.split("/track/")[1];
    if (match) {
      return match.split("?")[0];
    }
  }
  return undefined;
}

export function PlaylistView({ entries, curators }: PlaylistViewProps) {
  const {
    state: { timeWindow, curator },
  } = useFilters();
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const [drawerEntry, setDrawerEntry] = React.useState<PlaylistEntry | null>(null);
  const [yamsUrl, setYamsUrl] = React.useState<string | null>(null);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const [audioInfo, setAudioInfo] = React.useState<{
    url: string;
    title: string;
    artist: string;
  } | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<PlaylistOption | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [dismissSubmitting, setDismissSubmitting] = React.useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => { if (dismissedIds.has(entry.id)) { return false; } if (entry.checked) { return false; } if (entry.liked) { return false; } if (curator && entry.curator !== curator) { return false; } if (!filterByTimeWindow(entry.addedAt, timeWindow)) { return false; } return true; });
  }, [entries, curator, timeWindow, dismissedIds]);

  React.useEffect(() => {
    // Reset to first page when filters or dataset change
    setPage(1);
  }, [curator, timeWindow, dismissedIds, entries.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paged = filtered.slice(start, end);

  const closeDrawer = React.useCallback(() => {
    setDrawerEntry(null);
    setSelectedPlaylist(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    if (!drawerEntry) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerEntry, closeDrawer]);

  React.useEffect(() => {
    if (!yamsUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setYamsUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yamsUrl]);

  const sanitizeTrackQuery = (value: string) => {
    const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleaned = noDiacritics.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned;
  };

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

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function fetchJsonWithFallback(build: (host: string) => string): Promise<unknown> {
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
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    throw lastErr ?? new Error("All hosts failed");
  }

  const handlePlay = async (entry: PlaylistEntry) => {
    try {
      setAudioLoading(true);
      setAudioInfo(null);
      setYamsUrl(null);
      const q = sanitizeTrackQuery(`${entry.artist} ${entry.track}`);
      const searchJson = await fetchJsonWithFallback((host) => `https://${host}/search/?s=${encodeURIComponent(q)}`);
      const id: string | undefined = (() => {
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
      if (!id) throw new Error("No id found");
      await delay(2000);
      const trackJson = (await fetchJsonWithFallback(
        (host) => `https://${host}/track/?id=${encodeURIComponent(id)}&quality=LOW`,
      )) as unknown;
      const arr = Array.isArray(trackJson) ? (trackJson as unknown[]) : [trackJson];
      const objs = arr.map((o) => (typeof o === "object" && o !== null ? (o as Record<string, unknown>) : {}));
      const meta = objs.find((o) => typeof o["title"] === "string");
      const urlObj = objs.find(
        (o) => typeof o["OriginalTrackUrl"] === "string" || typeof o["originalURLTrack"] === "string" || typeof o["originalTrackURL"] === "string",
      );
      const url = (urlObj?.["OriginalTrackUrl"] ?? urlObj?.["originalURLTrack"] ?? urlObj?.["originalTrackURL"]) as string | undefined;
      const title: string = (meta?.["title"] as string | undefined) ?? entry.track;
      let artist: string = entry.artist;
      const artistName = meta?.["artistName"];
      if (typeof artistName === "string") {
        artist = artistName;
      } else {
        const artistObj = meta?.["artist"];
        if (artistObj && typeof artistObj === "object") {
          const nameVal = (artistObj as Record<string, unknown>)["name"];
          if (typeof nameVal === "string") artist = nameVal;
        }
      }
      if (!url) throw new Error("No streaming URL");
      setAudioInfo({ url, title, artist });
      // autoplay once ready
      setTimeout(() => {
        try {
          if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        } catch {}
      }, 100);
    } catch (e) {
      console.error("Failed to fetch streaming URL", e);
      setAudioInfo(null);
    } finally {
      setAudioLoading(false);
    }
  };

  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onLoaded = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioInfo]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  };

  const onSeek = (val: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(val)) return;
    el.currentTime = Math.min(Math.max(0, val), duration || 0);
    setCurrentTime(el.currentTime);
  };

  const onVol = (val: number) => {
    const el = audioRef.current;
    const v = Math.min(Math.max(0, val), 1);
    setVolume(v);
    if (el) el.volume = v;
  };

  const fmtTime = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleAddToPlaylist = async () => {
  if (!drawerEntry || !selectedPlaylist) return;
  const spotifyId = extractSpotifyId(drawerEntry);
  if (!spotifyId) {
    setSubmitError("Missing Spotify ID for this track.");
    return;
  }
  setIsSubmitting(true);
  setSubmitError(null);
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spotify_id: spotifyId,
        playlist: selectedPlaylist,
        artist: drawerEntry.artist,
        track: drawerEntry.track,
        checked: "TRUE",
        liked: "TRUE",
      }),
    });
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
    setFeedback({
      type: "success",
      message: `Sent "${drawerEntry.track}" to ${selectedPlaylist}.`,
    });
    // Hide the entry from the list, similar to dismiss
    setDismissedIds((prev) => {
      const next = new Set(prev);
      if (drawerEntry) next.add(drawerEntry.id);
      return next;
    });
    closeDrawer();
  } catch (error) {
    console.error("Failed to trigger playlist webhook", error);
    setSubmitError("Could not reach the playlist webhook. Please try again.");
    setIsSubmitting(false);
  }
};

  const handleDismiss = async (entry: PlaylistEntry) => {
  const spotifyId = extractSpotifyId(entry);
  if (!spotifyId) {
    setFeedback({ type: "error", message: "Missing Spotify ID for this track." });
    return;
  }
  setDismissSubmitting((prev) => {
    const next = new Set(prev);
    next.add(entry.id);
    return next;
  });
  try {
    const response = await fetch(TRACK_CHECK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotify_id: spotifyId, checked: "TRUE" }),
    });
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
    setFeedback({ type: "success", message: `Marked "${entry.track}" as checked.` });
  } catch (error) {
    console.error("Failed to trigger track checked webhook", error);
    setFeedback({ type: "error", message: "Could not mark this track as checked. Please try again." });
  } finally {
    setDismissSubmitting((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
  }
};

  return (
    <div className="fixed top-0 bottom-0 right-0 left-14 md:left-16 md:flex md:gap-0 md:overflow-hidden">
      <div className={clsx("space-y-4 w-full md:w-1/2 h-full overflow-y-auto px-4 py-6") }>
      {/* Split filters into two matching cards */}
      <FilterToolbar showTimeWindow />
      <FilterToolbar curators={curators} showCuratorFilter showTimeWindow={false} />
      {feedback && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-50">
          <div
            className={clsx(
              "pointer-events-auto rounded-md border p-3 text-sm shadow-lg",
              feedback.type === "success"
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-900"
                : "border-rose-300/60 bg-rose-50 text-rose-900",
            )}
            role="status"
          >
            {feedback.message}
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          Nothing to show. Adjust your filters or check back later.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-1">
          {paged.map((entry) => {
            if (dismissedIds.has(entry.id)) {
              return null;
            }
            const isChecked = entry.checked;
            const isDismissLoading = dismissSubmitting.has(entry.id);
            return (
              <Card key={entry.id} className="flex flex-col">
                <CardHeader className="flex flex-col gap-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <CardTitle className="text-lg font-medium leading-snug text-foreground break-words whitespace-normal">
                        {entry.artist}
                        <span className="px-2 text-muted-foreground">-</span>
                        {entry.track}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="h-5 w-fit px-1.5 text-[10px]">
                          {entry.curator}
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <span className="capitalize">Added {formatRelativeDate(entry.addedAt)}</span>
                        {isChecked && (
                          <Badge variant="outline" className="h-5 w-fit border-dashed px-1.5 text-[10px] text-muted-foreground">
                            Already listened
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-start">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-rose-600 ring-1 ring-rose-300/40 hover:bg-rose-50 hover:ring-rose-400/60 hover:!text-rose-700 focus-visible:ring-rose-500/60 focus-visible:!text-rose-700 transition-colors"
                        onClick={() => handleDismiss(entry)}
                        disabled={isDismissLoading}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden />
                        <span className="sr-only">Close</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-amber-600 ring-1 ring-amber-300/40 hover:bg-amber-50 hover:ring-amber-400/60 hover:!text-amber-700 focus-visible:ring-amber-500/60 focus-visible:!text-amber-700 transition-colors"
                        onClick={() => {
                          setDrawerEntry(entry);
                          setSelectedPlaylist(null);
                          setSubmitError(null);
                        }}
                      >
                        <i className="fa-solid fa-plus" aria-hidden />
                        <span className="sr-only">Add to playlist</span>
                      </Button>
                      {/* External actions moved to footer to match album cards */}
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="flex items-center gap-1 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2"
                    title="Play (Squid)"
                    onClick={() => handlePlay(entry)}
                  >
                    <i className="fa-solid fa-play" aria-hidden />
                    <span className="sr-only">Play</span>
                    <span className="ml-1">Squid</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setAudioInfo(null);
                      setAudioLoading(false);
                      setYamsUrl(
                        `https://yams.tf/#/search/${encodeURIComponent(`${entry.artist} ${entry.track}`)}`,
                      );
                    }}
                  >
                    <i className="fa-solid fa-magnifying-glass" aria-hidden />
                    <span className="sr-only">Search on YAMS.TF</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
          <div>
            {filtered.length === 0 ? null : (
              <span>
                {Math.min(start + 1, filtered.length)}–{Math.min(end, filtered.length)} of {filtered.length}
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
      {drawerEntry && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={closeDrawer}
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
                  {drawerEntry.track}
                  <span className="px-2 text-muted-foreground">-</span>
                  {drawerEntry.artist}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeDrawer}>
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
              <Button variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button onClick={handleAddToPlaylist} disabled={!selectedPlaylist || isSubmitting}>
                {isSubmitting ? "Adding..." : "Add to playlist"}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Right pane: persistent external viewer (lean, full viewport height, no padding) */}
      <div className="relative hidden md:flex md:w-1/2 h-full flex-col border-l border-border/60 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {audioLoading ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <i className="fa-solid fa-spinner fa-spin text-2xl" aria-hidden />
            </div>
          ) : audioInfo ? (
            <div className="grid h-full place-items-center p-4">
              <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
                <div className="mb-4 text-center">
                  <div className="text-base font-semibold truncate">{audioInfo.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{audioInfo.artist}</div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-[1.03] active:scale-95"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
                    <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                  </button>
                  <div className="flex w-full items-center gap-3">
                    <div className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">{fmtTime(currentTime)}</div>
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
                    <div className="w-12 text-[11px] tabular-nums text-muted-foreground">{fmtTime(Math.max(0, (duration || 0) - (currentTime || 0)))}</div>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <i className="fa-solid fa-volume-high text-muted-foreground" aria-hidden />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => onVol(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                      aria-label="Volume"
                    />
                  </div>
                </div>
                <audio ref={audioRef} src={audioInfo.url} className="hidden" />
              </div>
            </div>
          ) : yamsUrl ? (
            <iframe title="External" src={yamsUrl} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">No preview</div>
          )}
        </div>
      </div>
      {/* Mobile external viewer below content */}
      {(audioLoading || audioInfo || yamsUrl) && (
        <div className="relative md:hidden mt-4">
          <div className="h-[60vh] w-full">
            {audioLoading ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                <i className="fa-solid fa-spinner fa-spin text-2xl" aria-hidden />
              </div>
            ) : audioInfo ? (
              <div className="grid h-full place-items-center p-3">
                <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
                  <div className="mb-4 text-center">
                    <div className="text-base font-semibold truncate">{audioInfo.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{audioInfo.artist}</div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-[1.03] active:scale-95"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
                      <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                    </button>
                    <div className="flex w-full items-center gap-3">
                      <div className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">{fmtTime(currentTime)}</div>
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
                      <div className="w-12 text-[11px] tabular-nums text-muted-foreground">{fmtTime(Math.max(0, (duration || 0) - (currentTime || 0)))}</div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <i className="fa-solid fa-volume-high text-muted-foreground" aria-hidden />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => onVol(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                  <audio ref={audioRef} src={audioInfo.url} className="hidden" />
                </div>
              </div>
            ) : yamsUrl ? (
              <iframe title="External" src={yamsUrl} className="h-full w-full" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}


