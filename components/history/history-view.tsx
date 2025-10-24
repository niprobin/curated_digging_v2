"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlbumEntry, PlaylistEntry } from "@/lib/data";
import { formatRelativeDate } from "@/lib/utils";

interface HistoryViewProps {
  likedTracks: PlaylistEntry[];
  likedAlbums: AlbumEntry[];
}

export function HistoryView({ likedTracks, likedAlbums }: HistoryViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            Liked songs
            <Badge variant="secondary">{likedTracks.length}</Badge>
          </CardTitle>
          <CardDescription>Songs marked as liked in the playlist source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {likedTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No liked songs yet.</p>
          ) : (
            likedTracks.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{t.track}</p>
                  <p className="text-sm text-muted-foreground">{t.artist}</p>
                  <p className="text-xs text-muted-foreground/80">Added {formatRelativeDate(t.addedAt)}</p>
                </div>
                {t.spotifyUrl && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={t.spotifyUrl} target="_blank" rel="noreferrer">
                      <i className="fa-brands fa-spotify" aria-hidden />
                      Open in Spotify
                    </a>
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            Liked albums
            <Badge variant="secondary">{likedAlbums.length}</Badge>
          </CardTitle>
          <CardDescription>Albums marked as liked in the albums source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {likedAlbums.length === 0 ? (
            <p className="text-sm text-muted-foreground">No liked albums yet.</p>
          ) : (
            likedAlbums.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground/80">Added {formatRelativeDate(a.addedAt)}</p>
                </div>
                {a.spotifyUrl && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={a.spotifyUrl} target="_blank" rel="noreferrer">
                      <i className="fa-brands fa-spotify" aria-hidden />
                      Open in Spotify
                    </a>
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

