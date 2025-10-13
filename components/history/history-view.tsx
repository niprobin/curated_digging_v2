"use client";

import { useMemo } from "react";
import { useLikedHistory } from "@/components/history/history-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDateLabel(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function HistoryView() {
  const { history } = useLikedHistory();

  const grouped = useMemo(() => {
    const active: typeof history = [];
    const archived: typeof history = [];
    history.forEach((entry) => {
      if (entry.active) active.push(entry);
      else archived.push(entry);
    });
    return { active, archived };
  }, [history]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            Active likes
            <Badge variant="secondary">{grouped.active.length}</Badge>
          </CardTitle>
          <CardDescription>
            Songs and albums you have explicitly saved within the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Like tracks or albums and they will show up instantly.
            </p>
          ) : (
            grouped.active.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{entry.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.type === "track" ? "Track" : "Album"}
                    {entry.subtitle ? `  ${entry.subtitle}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Liked {formatDateLabel(entry.likedAt)}
                  </p>
                </div>
                {entry.url && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={entry.url} target="_blank" rel="noreferrer">
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
            Past likes
            <Badge variant="outline">{grouped.archived.length}</Badge>
          </CardTitle>
          <CardDescription>Items you&apos;ve liked before but later removed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.archived.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived items yet.</p>
          ) : (
            grouped.archived.map((entry) => (
              <div
                key={entry.id}
                className="space-y-2 rounded-md border border-dashed border-border/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.type === "track" ? "Track" : "Album"}
                      {entry.subtitle ? `  ${entry.subtitle}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">Removed</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Liked {formatDateLabel(entry.likedAt)}
                  {entry.unlikedAt ? `  Removed ${formatDateLabel(entry.unlikedAt)}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
