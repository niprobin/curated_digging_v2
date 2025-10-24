"use client";

import Image from "next/image";
import * as React from "react";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLikedHistory } from "@/components/history/history-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate, parseSheetDate, formatOrdinalLongDate } from "@/lib/utils";
import type { AlbumEntry } from "@/lib/data";

interface AlbumViewProps {
  entries: AlbumEntry[];
}

export function AlbumView({ entries }: AlbumViewProps) {
  const {
    state: { timeWindow, hideChecked, showLikedOnly },
  } = useFilters();
  const { isLiked, like, unlike } = useLikedHistory();

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
    } catch (e) {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
    } catch (e) {
      // ignore
    }
  }, [ratings]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (raw) setDismissedIds(new Set<string>(JSON.parse(raw)));
    } catch (e) {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch (e) {
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

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
      if (dismissedIds.has(entry.id)) {
        return false;
      }
      if (hideChecked && entry.checked) {
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
  }, [entries, hideChecked, timeWindow, showLikedOnly, isLiked, dismissedIds]);

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

  const setRating = (entry: AlbumEntry, value: number) => {
    setRatings((prev) => ({ ...prev, [entry.id]: value }));
    // Consider any rating >=1 as a like
    const alreadyLiked = isLiked(entry.id, entry.liked) || entry.liked;
    if (value >= 1 && !alreadyLiked) {
      handleLike(entry, true);
    }
    setOpenRatingForId(null);
  };

  const handleDismiss = (entry: AlbumEntry) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <FilterToolbar />
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          No albums match your filters yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => {
            const liked = isLiked(entry.id, entry.liked) || entry.liked;
            const rating = ratings[entry.id] ?? 0;
            return (
              <Card key={entry.id} className="flex flex-col">
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 items-start gap-4">
                      {entry.coverUrl ? (
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md md:h-24 md:w-24">
                          <Image
                            src={entry.coverUrl}
                            alt={`Artwork for ${entry.name}`}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground md:h-24 md:w-24">
                          <i className="fa-solid fa-compact-disc text-xl" aria-hidden />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-2">
                        <CardTitle className="text-xl font-semibold text-foreground">{entry.name}</CardTitle>
                        {entry.releaseDate && (
                          <span className="text-sm text-muted-foreground">
                            Released
                            {" "}
                            <span className="font-medium text-foreground">
                              {formatOrdinalLongDate(parseSheetDate(entry.releaseDate))}
                            </span>
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground capitalize">
                          Added {formatRelativeDate(entry.addedAt)}
                        </span>
                        {entry.checked && (
                          <Badge variant="outline" className="w-fit border-dashed text-muted-foreground">
                            Already listened
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="relative flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={() => handleDismiss(entry)}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden />
                        <span className="sr-only">Remove</span>
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
                          <i
                            className={liked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart"}
                            aria-hidden
                          />
                          <span className="sr-only">Rate album</span>
                        </Button>
                        {openRatingForId === entry.id && (
                          <div
                            role="dialog"
                            aria-label="Rate album"
                            className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-border bg-popover p-2 shadow-md"
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
                  {(rating || liked) && (
                    <div className="text-sm text-muted-foreground">
                      {rating ? `Rated ${rating}/5` : "You like this"}
                    </div>
                  )}
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
