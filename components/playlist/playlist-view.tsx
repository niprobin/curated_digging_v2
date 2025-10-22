"use client";

import * as React from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { useLikedHistory } from "@/components/history/history-provider";
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
    state: { timeWindow, curator, hideChecked, showLikedOnly },
  } = useFilters();
  const { isLiked } = useLikedHistory();
  const [localCheckedIds, setLocalCheckedIds] = React.useState<Set<string>>(() => new Set());
  const [drawerEntry, setDrawerEntry] = React.useState<PlaylistEntry | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<PlaylistOption | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [dismissSubmitting, setDismissSubmitting] = React.useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
      if (dismissedIds.has(entry.id)) {
        return false;
      }
      const isChecked = entry.checked || localCheckedIds.has(entry.id);
      if (hideChecked && isChecked) {
        return false;
      }
      if (curator && entry.curator !== curator) {
        return false;
      }
      if (!filterByTimeWindow(entry.addedAt, timeWindow)) {
        return false;
      }
      const liked = isLiked(entry.id, entry.liked) || entry.liked;
      if (showLikedOnly && !liked) {
        return false;
      }
      return true;
    });
  }, [
    entries,
    hideChecked,
    curator,
    timeWindow,
    showLikedOnly,
    isLiked,
    localCheckedIds,
    dismissedIds,
  ]);

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
          checked: "TRUE",
          liked: "TRUE",
        }),
      });
        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }
        setLocalCheckedIds((prev) => {
          const next = new Set(prev);
          next.add(drawerEntry.id);
          return next;
        });
        setFeedback({
          type: "success",
          message: `Sent "${drawerEntry.track}" to ${selectedPlaylist}.`,
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
      setFeedback({
        type: "error",
        message: "Missing Spotify ID for this track.",
      });
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spotify_id: spotifyId,
          checked: "TRUE",
        }),
      });
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      setLocalCheckedIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
      setFeedback({
        type: "success",
        message: `Marked "${entry.track}" as checked.`,
      });
    } catch (error) {
      console.error("Failed to trigger track checked webhook", error);
      setFeedback({
        type: "error",
        message: "Could not mark this track as checked. Please try again.",
      });
    } finally {
      setDismissSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <FilterToolbar
        curators={curators}
        showCuratorFilter
        onCuratorChange={() => {
          /* noop - handled through context */
        }}
      />
      {feedback && (
        <div
          className={clsx(
            "rounded-md border p-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-300/60 bg-emerald-50 text-emerald-900"
              : "border-rose-300/60 bg-rose-50 text-rose-900",
          )}
          role="status"
        >
          {feedback.message}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          Nothing to show. Adjust your filters or check back later.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => {
            if (dismissedIds.has(entry.id)) {
              return null;
            }
            const isChecked = entry.checked || localCheckedIds.has(entry.id);
            const isDismissLoading = dismissSubmitting.has(entry.id);
            return (
              <Card key={entry.id} className="flex flex-col">
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <CardTitle className="text-xl font-semibold text-foreground">{entry.track}</CardTitle>
                      <Badge variant="secondary" className="w-fit">
                        {entry.curator}
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        Added {formatRelativeDate(entry.addedAt)}
                      </span>
                      {isChecked && (
                        <Badge variant="outline" className="w-fit border-dashed text-muted-foreground">
                          Already listened
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={() => handleDismiss(entry)}
                        disabled={isDismissLoading}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden />
                        <span className="sr-only">Close</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDrawerEntry(entry);
                          setSelectedPlaylist(null);
                          setSubmitError(null);
                        }}
                      >
                        <i className="fa-solid fa-plus" aria-hidden />
                        <span className="sr-only">Add to playlist</span>
                      </Button>
                      {entry.spotifyUrl && (
                        <Button asChild variant="secondary" size="icon">
                          <a href={entry.spotifyUrl} target="_blank" rel="noreferrer">
                            <i className="fa-brands fa-spotify" aria-hidden />
                            <span className="sr-only">Open in Spotify</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
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
  );
}
