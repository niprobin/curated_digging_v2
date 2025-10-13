"use client";

import Image from "next/image";
import * as React from "react";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLikedHistory } from "@/components/history/history-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate } from "@/lib/utils";
import type { AlbumEntry } from "@/lib/data";

interface AlbumViewProps {
  entries: AlbumEntry[];
}

export function AlbumView({ entries }: AlbumViewProps) {
  const {
    state: { timeWindow, hideChecked, showLikedOnly },
  } = useFilters();
  const { isLiked, like, unlike } = useLikedHistory();

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
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
  }, [entries, hideChecked, timeWindow, showLikedOnly, isLiked]);

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
            return (
              <Card key={entry.id} className="flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row gap-4 p-0">
                  {entry.coverUrl ? (
                    <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-none md:h-48 md:w-48">
                      <Image
                        src={entry.coverUrl}
                        alt={`Artwork for ${entry.name}`}
                        fill
                        className="object-cover"
                        sizes="192px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center bg-muted text-muted-foreground">
                      <i className="fa-solid fa-compact-disc text-3xl" aria-hidden />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-semibold">{entry.name}</CardTitle>
                      <CardDescription className="flex flex-col gap-1 text-sm">
                        {entry.releaseDate && (
                          <span>
                            Released <span className="font-medium text-foreground">{entry.releaseDate}</span>
                          </span>
                        )}
                        <span className="capitalize">
                          Added {formatRelativeDate(entry.addedAt)}
                        </span>
                      </CardDescription>
                    </div>
                    {entry.checked && (
                      <Badge variant="outline" className="w-fit border-dashed text-muted-foreground">
                        Already listened
                      </Badge>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <i
                          className={liked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart"}
                          aria-hidden
                        />
                        <span>{liked ? "You like this" : "Tap to like"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-pressed={liked}
                          onClick={() => handleLike(entry, !liked)}
                        >
                          <i
                            className={liked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart"}
                            aria-hidden
                          />
                          <span className="sr-only">Toggle album like</span>
                        </Button>
                        {entry.spotifyUrl && (
                          <Button asChild size="sm" variant="secondary">
                            <a href={entry.spotifyUrl} target="_blank" rel="noreferrer">
                              <i className="fa-brands fa-spotify" aria-hidden />
                              Open
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
