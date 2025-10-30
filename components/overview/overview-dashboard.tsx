"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/utils";
import type { AlbumEntry, PlaylistEntry } from "@/lib/data";

interface OverviewDashboardProps {
  playlists: PlaylistEntry[];
  albums: AlbumEntry[];
}

export function OverviewDashboard({ playlists, albums }: OverviewDashboardProps) {
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const recentPlaylists = playlists.filter(
    (e) => now.getTime() - e.addedAt.getTime() <= sevenDaysMs && !e.checked && !e.liked,
  );
  const recentAlbums = albums.filter(
    (e) => now.getTime() - e.addedAt.getTime() <= sevenDaysMs && !e.checked && !e.liked,
  );

  const nothingNew = recentPlaylists.length === 0 && recentAlbums.length === 0;

  const topPlaylists = recentPlaylists.slice(0, 4);
  const topAlbums = recentAlbums.slice(0, 4);

  return (
    <div className="space-y-6">
      {nothingNew ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
          No new music in the last 7 days.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <i className="fa-solid fa-music" aria-hidden />
                New tracks (7 days)
              </CardTitle>
              <CardDescription>
                {recentPlaylists.length} tracks added in the last week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/playlists">
                  Open tracks
                  <i className="fa-solid fa-arrow-right" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <i className="fa-solid fa-compact-disc" aria-hidden />
                New albums (7 days)
              </CardTitle>
              <CardDescription>{recentAlbums.length} albums added in the last week.</CardDescription>
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
      )}

      {!nothingNew && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Recent tracks
                <Badge variant="secondary">{recentPlaylists.length}</Badge>
              </CardTitle>
              <CardDescription>Added in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topPlaylists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracks to highlight right now.</p>
              ) : (
                topPlaylists.map((entry) => (
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
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Recent albums
                <Badge variant="secondary">{recentAlbums.length}</Badge>
              </CardTitle>
              <CardDescription>Added in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topAlbums.length === 0 ? (
                <p className="text-sm text-muted-foreground">No albums to highlight right now.</p>
              ) : (
                topAlbums.map((entry) => (
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
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
