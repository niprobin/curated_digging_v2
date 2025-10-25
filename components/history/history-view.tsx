"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlbumEntry, PlaylistEntry } from "@/lib/data";
import { formatRelativeDate } from "@/lib/utils";

interface HistoryViewProps {
  likedTracks: PlaylistEntry[];
  likedAlbums: AlbumEntry[];
}

export function HistoryView({ likedTracks, likedAlbums }: HistoryViewProps) {
  const [tab, setTab] = React.useState<"songs" | "albums">("songs");
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);

  const isSongs = tab === "songs";
  const count = isSongs ? likedTracks.length : likedAlbums.length;

  React.useEffect(() => {
    setPage(1);
  }, [tab, likedTracks.length, likedAlbums.length]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const songsPaged = likedTracks.slice(start, end);
  const albumsPaged = likedAlbums.slice(start, end);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Your likes</CardTitle>
            <div className="flex items-center gap-2 rounded-md border border-border p-1">
              <Button
                size="sm"
                variant={isSongs ? "secondary" : "ghost"}
                onClick={() => setTab("songs")}
              >
                Songs <Badge variant="secondary" className="ml-2">{likedTracks.length}</Badge>
              </Button>
              <Button
                size="sm"
                variant={!isSongs ? "secondary" : "ghost"}
                onClick={() => setTab("albums")}
              >
                Albums <Badge variant="secondary" className="ml-2">{likedAlbums.length}</Badge>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {count === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isSongs ? "No liked songs yet." : "No liked albums yet."}
            </p>
          ) : isSongs ? (
            songsPaged.map((t) => (
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
          ) : (
            albumsPaged.map((a) => (
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
          {count > 0 && (
            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div>
                <span>
                  {Math.min(start + 1, count)}–{Math.min(end, count)} of {count}
                </span>
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
        </CardContent>
      </Card>
    </div>
  );
}
