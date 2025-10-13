"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { LikeableItem, useLikedHistory } from "@/components/history/history-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate } from "@/lib/utils";
import type { PlaylistEntry } from "@/lib/data";

interface PlaylistViewProps {
  entries: PlaylistEntry[];
  curators: string[];
}

export function PlaylistView({ entries, curators }: PlaylistViewProps) {
  const {
    state: { timeWindow, curator, hideChecked, showLikedOnly },
  } = useFilters();
  const { isLiked, like, unlike } = useLikedHistory();

  const filtered = React.useMemo(() => {
    return entries.filter((entry) => {
      if (hideChecked && entry.checked) {
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
  }, [entries, hideChecked, curator, timeWindow, showLikedOnly, isLiked]);

  const handleLike = (entry: PlaylistEntry, liked: boolean) => {
    const item: LikeableItem = {
      id: entry.id,
      type: "track",
      title: entry.track,
      subtitle: entry.artist,
      url: entry.spotifyUrl,
    };
    if (liked) {
      like(item, entry.liked);
    } else {
      unlike(entry.id, entry.liked);
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
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          Nothing to show. Adjust your filters or check back later.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => {
            const liked = isLiked(entry.id, entry.liked) || entry.liked;
            return (
              <Card key={entry.id} className="flex flex-col">
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-semibold">
                        {entry.track}
                      </CardTitle>
                      <CardDescription className="flex flex-col text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{entry.artist}</span>
                        <span className="capitalize">Added {formatRelativeDate(entry.addedAt)}</span>
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{entry.curator}</Badge>
                  </div>
                  {entry.checked && (
                    <Badge variant="outline" className="w-fit border-dashed text-muted-foreground">
                      Already listened
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <i
                      className={liked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart"}
                      aria-hidden
                    />
                    <span>{liked ? "In your liked queue" : "Not liked yet"}</span>
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
                      <span className="sr-only">Toggle like</span>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
