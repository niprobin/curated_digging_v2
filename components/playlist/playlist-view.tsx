"use client";

import * as React from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate, extractSpotifyId, sanitizeQuery } from "@/lib/utils";
import type { PlaylistEntry } from "@/lib/data";
import type { PlaylistOption } from "@/components/playlist/playlist-options";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useResizePagination } from "@/hooks/use-pagination";
import { useLocalStorageSet } from "@/hooks/use-local-storage";
import { useWebhook } from "@/hooks/use-webhook";
import { AudioPlayer } from "@/components/audio/audio-player";
import { PlaylistDrawer, type PlaylistDrawerTrack } from "@/components/playlist/playlist-drawer";
import { WEBHOOKS, EXTERNAL_SERVICES } from "@/lib/config";

interface PlaylistViewProps {
  entries: PlaylistEntry[];
  curators: string[];
}

export function PlaylistView({ entries, curators }: PlaylistViewProps) {
  const {
    state: { timeWindow, curator },
  } = useFilters();

  // State management with custom hooks
  const [dismissedIds, setDismissedIds] = useLocalStorageSet("curated-digging:track-dismissed");
  const [dismissSubmitting, setDismissSubmitting] = React.useState<Set<string>>(() => new Set());
  const [yamsUrl, setYamsUrl] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Playlist drawer state
  const [drawerTrack, setDrawerTrack] = React.useState<PlaylistDrawerTrack | null>(null);
  const [drawerEntry, setDrawerEntry] = React.useState<PlaylistEntry | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<PlaylistOption | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Audio player hook
  const player = useAudioPlayer();

  // Filtering logic
  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
      if (dismissedIds.has(entry.id)) return false;
      if (entry.checked) return false;
      if (entry.liked) return false;
      if (curator && entry.curator !== curator) return false;
      if (!filterByTimeWindow(entry.addedAt, timeWindow)) return false;
      return true;
    });
  }, [entries, curator, timeWindow, dismissedIds]);

  // Pagination with resize hook
  const pagination = useResizePagination(filtered.length, 72, {
    minPageSize: 5,
    maxPageSize: 25,
    fallbackHeight: 580,
  });

  const paged = filtered.slice(pagination.startIndex, pagination.endIndex);

  // Reset pagination when filters change
  React.useEffect(() => {
    pagination.resetToFirstPage();
  }, [curator, timeWindow, dismissedIds, entries.length, pagination.pageSize]);

  // Webhook for adding to playlist
  const { trigger: addToPlaylist, isLoading: isSubmitting } = useWebhook<
    { spotify_id: string; playlist: string; artist: string; track: string; checked: string; liked: string },
    unknown
  >({
    url: WEBHOOKS.addToPlaylist,
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: `Sent "${drawerEntry?.track}" to ${selectedPlaylist}.`,
      });
      if (drawerEntry) {
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.add(drawerEntry.id);
          return next;
        });
      }
      closeDrawer();
    },
    onError: () => {
      setSubmitError("Could not reach the playlist webhook. Please try again.");
    },
  });

  // Webhook for marking track as checked
  const { trigger: markChecked } = useWebhook<{ spotify_id: string; checked: string }, unknown>({
    url: WEBHOOKS.trackChecked,
  });

  // Close drawer handler
  const closeDrawer = React.useCallback(() => {
    setDrawerTrack(null);
    setDrawerEntry(null);
    setSelectedPlaylist(null);
    setSubmitError(null);
  }, []);

  // Handle Escape key for yamsUrl
  React.useEffect(() => {
    if (!yamsUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setYamsUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yamsUrl]);

  // Auto-hide feedback after 5 seconds
  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // Play track handler
  const handlePlay = async (entry: PlaylistEntry) => {
    try {
      setYamsUrl(null);
      await player.playTrack(entry.artist, entry.track, extractSpotifyId(entry.spotifyUrl, entry.spotifyId));
    } catch {
      setFeedback({
        type: "error",
        message: "Cannot play this preview right now. Please try again.",
      });
    }
  };

  // Add to playlist handler
  const handleAddToPlaylist = async () => {
    if (!drawerEntry || !selectedPlaylist) return;

    const spotifyId = extractSpotifyId(drawerEntry.spotifyUrl, drawerEntry.spotifyId);
    if (!spotifyId) {
      setSubmitError("Missing Spotify ID for this track.");
      return;
    }

    await addToPlaylist({
      spotify_id: spotifyId,
      playlist: selectedPlaylist,
      artist: drawerEntry.artist,
      track: drawerEntry.track,
      checked: "TRUE",
      liked: "TRUE",
    });
  };

  // Dismiss track handler
  const handleDismiss = async (entry: PlaylistEntry) => {
    const spotifyId = extractSpotifyId(entry.spotifyUrl, entry.spotifyId);
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
      await markChecked({ spotify_id: spotifyId, checked: "TRUE" });
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
      setFeedback({ type: "success", message: `Marked "${entry.track}" as checked.` });
    } catch {
      setFeedback({ type: "error", message: "Could not mark this track as checked. Please try again." });
    } finally {
      setDismissSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  // Open drawer handler
  const openDrawer = (entry: PlaylistEntry) => {
    setDrawerEntry(entry);
    setDrawerTrack({ title: entry.track, artist: entry.artist });
    setSelectedPlaylist(null);
    setSubmitError(null);
  };

  return (
    <div className="fixed top-0 bottom-0 right-0 left-14 md:left-16 md:flex md:gap-0 md:overflow-hidden">
      <div className="flex h-full w-full flex-col gap-4 overflow-hidden px-4 py-6 md:w-1/2">
        <div className="space-y-3">
          <FilterToolbar showTimeWindow />
          <FilterToolbar curators={curators} showCuratorFilter showTimeWindow={false} />
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-50">
            <div
              className={clsx(
                "pointer-events-auto rounded-md border p-3 text-sm shadow-lg",
                feedback.type === "success"
                  ? "border-emerald-300/60 bg-emerald-50 text-emerald-900"
                  : "border-rose-300/60 bg-rose-50 text-rose-900"
              )}
              role="status"
            >
              {feedback.message}
            </div>
          </div>
        )}

        {/* Track list */}
        <div ref={pagination.containerRef} className="flex flex-1 flex-col overflow-hidden">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              Nothing to show. Adjust your filters or check back later.
            </div>
          ) : (
            <div className="flex-1 overflow-hidden rounded-lg border border-border/70 bg-card/30">
              <div className="divide-y divide-border/60">
                {paged.map((entry, idx) => {
                  if (dismissedIds.has(entry.id)) return null;

                  const rowNumber = pagination.startIndex + idx + 1;
                  const isChecked = entry.checked;
                  const isDismissLoading = dismissSubmitting.has(entry.id);

                  return (
                    <div
                      key={entry.id}
                      className={clsx(
                        "group flex flex-wrap items-center gap-3 px-3 py-2 text-sm transition-colors",
                        "hover:bg-card/70",
                        isChecked && "opacity-60"
                      )}
                    >
                      <div className="w-6 text-xs font-mono text-muted-foreground">{rowNumber}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-foreground">{entry.track}</span>
                          <span className="truncate text-[13px] text-muted-foreground">{entry.artist}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground opacity-80">
                          <Badge variant="secondary" className="h-5 w-fit px-1.5 text-[10px]">
                            {entry.curator}
                          </Badge>
                          <span className="text-muted-foreground">&middot;</span>
                          <span className="capitalize">{formatRelativeDate(entry.addedAt)}</span>
                          {isChecked && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Checked
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary"
                          title="Play preview"
                          onClick={() => handlePlay(entry)}
                          disabled={player.isLoading}
                        >
                          <i className="fa-solid fa-play" aria-hidden />
                          <span className="sr-only">Play preview</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Search on YAMS.TF"
                          onClick={() => {
                            player.stop();
                            const yamsQuery = sanitizeQuery(`${entry.artist} ${entry.track}`);
                            setYamsUrl(EXTERNAL_SERVICES.yamsSearch(yamsQuery));
                          }}
                        >
                          <span className="text-sm font-semibold">Y</span>
                          <span className="sr-only">Search YAMS.TF</span>
                        </Button>
                        <Button variant="ghost" size="icon" title="Add to playlist" onClick={() => openDrawer(entry)}>
                          <i className="fa-solid fa-plus" aria-hidden />
                          <span className="sr-only">Add to playlist</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Mark as checked"
                          onClick={() => handleDismiss(entry)}
                          disabled={isDismissLoading}
                        >
                          <i className="fa-solid fa-xmark" aria-hidden />
                          <span className="sr-only">Mark as checked</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
              <div>
                <span>
                  {Math.min(pagination.startIndex + 1, filtered.length)}-
                  {Math.min(pagination.endIndex, filtered.length)} of {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={pagination.prevPage}
                  disabled={pagination.currentPage <= 1}
                >
                  Prev
                </Button>
                <span>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={pagination.nextPage}
                  disabled={pagination.currentPage >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right pane: audio player or external viewer */}
      <div className="relative hidden md:flex md:w-1/2 h-full flex-col border-l border-border/60 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {yamsUrl ? (
            <iframe title="External" src={yamsUrl} className="h-full w-full" />
          ) : (
            <AudioPlayer
              {...player}
              onTogglePlay={player.togglePlay}
              onSeek={player.seek}
              onVolumeChange={player.setVolume}
              variant="desktop"
            />
          )}
        </div>
      </div>

      {/* Mobile external viewer */}
      {(player.isLoading || player.audioInfo || yamsUrl) && (
        <div className="relative md:hidden mt-4">
          <div className="h-[60vh] w-full">
            {yamsUrl ? (
              <iframe title="External" src={yamsUrl} className="h-full w-full" />
            ) : (
              <AudioPlayer
                {...player}
                onTogglePlay={player.togglePlay}
                onSeek={player.seek}
                onVolumeChange={player.setVolume}
                variant="desktop"
              />
            )}
          </div>
        </div>
      )}

      {/* Playlist drawer */}
      <PlaylistDrawer
        track={drawerTrack}
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={setSelectedPlaylist}
        onClose={closeDrawer}
        onSubmit={handleAddToPlaylist}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </div>
  );
}
