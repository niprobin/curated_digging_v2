"use client";

import Link from "next/link";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { useFilters } from "@/components/filters/filter-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLikedHistory } from "@/components/history/history-provider";
import { filterByTimeWindow } from "@/lib/filters";
import { formatRelativeDate } from "@/lib/utils";
import type { AlbumEntry, PlaylistEntry } from "@/lib/data";

interface OverviewDashboardProps {
  playlists: PlaylistEntry[];
  curators: string[];
  albums: AlbumEntry[];
}

export function OverviewDashboard({ playlists, curators, albums }: OverviewDashboardProps) {
  const {
    state: { timeWindow, hideChecked, showLikedOnly, curator },
  } = useFilters();
  const { isLiked } = useLikedHistory();

  const filteredPlaylists = playlists.filter((entry) => {
    if (hideChecked && entry.checked) return false;
    if (curator && entry.curator !== curator) return false;
    if (!filterByTimeWindow(entry.addedAt, timeWindow)) return false;
    const liked = isLiked(entry.id, entry.liked) || entry.liked;
    if (showLikedOnly && !liked) return false;
    return true;
  });

  const filteredAlbums = albums.filter((entry) => {
    if (hideChecked && entry.checked) return false;
    if (!filterByTimeWindow(entry.addedAt, timeWindow)) return false;
    const liked = isLiked(entry.id, entry.liked) || entry.liked;
    if (showLikedOnly && !liked) return false;
    return true;
  });

  const topPlaylists = filteredPlaylists.slice(0, 4);
  const topAlbums = filteredAlbums.slice(0, 4);

  return (
    <div className="space-y-6">
      <FilterToolbar curators={curators} showCuratorFilter={Boolean(curators.length)} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <i className="fa-solid fa-music" aria-hidden />
              Tracks to check
            </CardTitle>
            <CardDescription>
              Based on your filters {filteredPlaylists.length} tracks await a listen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/playlists">
                Open playlists
                <i className="fa-solid fa-arrow-right" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <i className="fa-solid fa-compact-disc" aria-hidden />
              Albums in queue
            </CardTitle>
            <CardDescription>
              {filteredAlbums.length} curated releases match your current window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/albums">
                Explore albums
                <i className="fa-solid fa-arrow-right" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <i className="fa-solid fa-heart" aria-hidden />
              Liked history
            </CardTitle>
            <CardDescription>Review everything you&apos;ve saved for later.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/history">
                View history
                <i className="fa-solid fa-arrow-right" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Recent tracks
              <Badge variant="secondary">{filteredPlaylists.length}</Badge>
            </CardTitle>
            <CardDescription>
              The latest additions within your selected window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPlaylists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracks to highlight right now.</p>
            ) : (
              topPlaylists.map((entry) => {
                const liked = isLiked(entry.id, entry.liked) || entry.liked;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 rounded-md border border-transparent px-2 py-1 hover:border-border hover:bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground">{entry.track}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.artist} - {entry.curator}
                      </p>
                    </div>
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>{formatRelativeDate(entry.addedAt)}</span>
                      {liked && <i className="fa-solid fa-heart text-rose-500" aria-hidden />}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Recent albums
              <Badge variant="secondary">{filteredAlbums.length}</Badge>
            </CardTitle>
            <CardDescription>
              What&apos;s new in your release watch list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topAlbums.length === 0 ? (
              <p className="text-sm text-muted-foreground">No albums to highlight right now.</p>
            ) : (
              topAlbums.map((entry) => {
                const liked = isLiked(entry.id, entry.liked) || entry.liked;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 rounded-md border border-transparent px-2 py-1 hover:border-border hover:bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground">{entry.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.releaseDate ? `Released ${entry.releaseDate}` : "Release date TBC"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>{formatRelativeDate(entry.addedAt)}</span>
                      {liked && <i className="fa-solid fa-heart text-rose-500" aria-hidden />}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
