"use client";

import Image from "next/image";
import * as React from "react";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const { isLiked, like, unlike } = useLikedHistory();
  const ALBUM_WEBHOOK_URL = "https://n8n.niprobin.com/webhook/album-webhook";
  const [externalLoading, setExternalLoading] = React.useState<Set<string>>(() => new Set());
  const [yamsUrl, setYamsUrl] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!yamsUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setYamsUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yamsUrl]);

  const filtered = React.useMemo(() => {
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
      return true;
    });
  }, [entries, hideChecked, timeWindow, showLikedOnly, isLiked, dismissedIds]);

  React.useEffect(() => {
    setPage(1);
  }, [timeWindow, hideChecked, showLikedOnly, dismissedIds, entries.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paged = filtered.slice(start, end);

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
      const q = sanitizeQuery(entry.name);
      const searchUrl = `https://api.yams.tf/search?query=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error(`Search returned ${res.status}`);
      const json = await res.json();
      const id: string | undefined = json?.albums?.[0]?.id;
      if (id) {
        setYamsUrl(`https://yams.tf/#/album/2/${id}`);
      } else {
        // Fallback to search page if no id is found
        setYamsUrl(`https://yams.tf/#/search/${encodeURIComponent(q)}`);
      }
    } catch (err) {
      console.error("Failed to get external link", err);
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
      const url = `https://kraken.squid.wtf/search/?al=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search returned ${res.status}`);
      const json = await res.json();
      const id: string | undefined = json?.albums?.items?.[0]?.id;
      if (id) {
        const link = `https://music.binimum.org/album/${id}`;
        setYamsUrl(link);
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
      <div className="space-y-6 w-full md:w-1/2 h-full overflow-y-auto px-4 py-6">
        <FilterToolbar />
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          No albums match your filters yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {paged.map((entry) => {
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
                        <CardTitle className="text-xl font-semibold leading-snug text-foreground break-words whitespace-normal">{entry.name}</CardTitle>
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
                        className="rounded-full text-rose-600 ring-1 ring-rose-300/40 hover:bg-rose-50 hover:ring-rose-400/60 hover:!text-rose-700 focus-visible:ring-rose-500/60 focus-visible:!text-rose-700 transition-colors"
                        onClick={() => handleDismiss(entry)}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden />
                        <span className="sr-only">Remove</span>
                      </Button>
                      <div className="relative" ref={openRatingForId === entry.id ? popoverRef : null}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-amber-600 ring-1 ring-amber-300/40 hover:bg-amber-50 hover:ring-amber-400/60 hover:!text-amber-700 focus-visible:ring-amber-500/60 focus-visible:!text-amber-700 transition-colors"
                          aria-pressed={liked}
                          onClick={() => setOpenRatingForId((id) => (id === entry.id ? null : entry.id))}
                          aria-haspopup="dialog"
                          aria-expanded={openRatingForId === entry.id}
                          title={rating ? `Rated ${rating}/5` : "Rate album"}
                        >
                          <i
                            className={liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}
                            aria-hidden
                          />
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
                      {/* moved external actions to footer */}
                    </div>
                  </div>
                  {(rating || liked) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {rating ? (
                        <>
                          <span className="flex items-center gap-0.5 text-foreground">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <i
                                key={v}
                                className={v <= rating ? "fa-solid fa-star" : "fa-regular fa-star"}
                                aria-hidden
                              />
                            ))}
                          </span>
                          <span className="ml-1">{rating}/5</span>
                        </>
                      ) : (
                        <span>You like this</span>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenExternal(entry)}
                    disabled={externalLoading.has(entry.id)}
                  >
                    YAMS.TF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleOpenBinimum(entry)}
                    disabled={externalLoading.has(entry.id)}
                  >
                    BINIMUM
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
      </div>
      {/* Right pane: persistent external viewer (lean, full viewport height, no padding) */}
      <div className="relative hidden md:flex md:w-1/2 h-full flex-col border-l border-border/60 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {yamsUrl ? (
            <iframe title="External" src={yamsUrl} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">No preview</div>
          )}
        </div>
      </div>
      {/* Mobile external viewer below content */}
      {yamsUrl && (
        <div className="relative md:hidden mt-4">
          <div className="h-[60vh] w-full">
            <iframe title="External" src={yamsUrl} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

// YAMS modal
// Rendered at the bottom of the component tree to overlay content
