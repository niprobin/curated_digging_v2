"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { AddToListForm } from "@/components/add-to-list/add-to-list-form";
import { AddToSongsForm } from "@/components/add-to-list/add-to-songs-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SearchResult = {
  artist: string;
  title: string;
  uploadedAt?: string;
  playlists: string[];
};

export function OverviewDashboard() {
  const totalItems = NAV_ITEMS.length;
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

  const onSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch("https://n8n.niprobin.com/webhook/search-azuracast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search_query: search.trim() }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : [json];
      const normalized = rows
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const lowerCaseRecord = Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
            acc[key.toLowerCase()] = value;
            return acc;
          }, {});
          const titleCandidates = ["title", "track", "text"];
          const artistCandidates = ["artist", "artists", "curator"];
          const pickString = (keys: string[]) => {
            for (const key of keys) {
              const value = lowerCaseRecord[key];
              if (typeof value === "string" && value.trim()) {
                return value.trim();
              }
            }
            return "";
          };
          const titleRaw = pickString(titleCandidates);
          const artistRaw = pickString(artistCandidates);
          if (!titleRaw && !artistRaw) return null;
          const uploadedAtValue = lowerCaseRecord["uploaded_at"] ?? lowerCaseRecord["uploadedat"];
          const uploadedAt = typeof uploadedAtValue === "string" ? uploadedAtValue : undefined;
          const playlistsRaw = lowerCaseRecord["playlists"] ?? lowerCaseRecord["playlist"];
          let playlists: string[] = [];
          if (Array.isArray(playlistsRaw)) {
            playlists = playlistsRaw
              .map((p) => (typeof p === "string" ? p.trim() : ""))
              .filter(Boolean);
          } else if (typeof playlistsRaw === "string") {
            playlists = playlistsRaw
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
          }
          return {
            artist: artistRaw || "Unknown artist",
            title: titleRaw || "Untitled track",
            uploadedAt,
            playlists,
          } satisfies SearchResult;
        })
        .filter((row): row is SearchResult => Boolean(row));
      setSearchResults(normalized);
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const formatUploadedAt = (value?: string) => {
    if (!value) return null;
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return null;
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return formatter.format(new Date(timestamp));
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {NAV_ITEMS.map((item, index) => {
          const isLast = index === totalItems - 1;
          const spanTwoOnSmall = isLast && totalItems % 2 === 1;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                spanTwoOnSmall && "sm:col-span-2",
              )}
            >
              <Card className="h-full border-border/70 px-4 py-3 transition-colors group-hover:border-primary group-hover:bg-card/80">
                <CardHeader className="flex flex-row items-center gap-4 p-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <i className={item.icon} aria-hidden />
                  </span>
                  <div className="space-y-0.5">
                    <CardTitle className="text-lg font-semibold">{item.label}</CardTitle>
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>Quick add</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Next album to listen to</h2>
          <AddToListForm />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add a song I liked</h2>
          <AddToSongsForm />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Search</h2>
        <form className="flex flex-col gap-3 md:flex-row md:items-end" onSubmit={onSearch}>
          <div className="flex-1">
            <input
              id="azuracast-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search query"
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
              placeholder="Artist or track"
            />
          </div>
          <Button type="submit" disabled={!search.trim() || searching}>
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>
        {searchError && <p className="text-sm text-rose-500">{searchError}</p>}
        {!searchError && searchResults.length > 0 && (
          <div className="space-y-3 rounded-md border border-border/80 bg-background/40 p-3 text-sm">
            {searchResults.map((row, idx) => {
              const uploadedLabel = formatUploadedAt(row.uploadedAt);
              return (
                <div
                  key={`${row.artist}-${row.title}-${idx}`}
                  className="border-b border-border/60 pb-3 last:border-none last:pb-0"
                >
                  <p className="font-semibold text-foreground">{row.title}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.artist}</p>
                  {uploadedLabel && (
                    <p className="mt-1 text-[11px] text-muted-foreground">Uploaded {uploadedLabel}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.playlists.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No playlists</span>
                    ) : (
                      row.playlists.map((playlist) => (
                        <Badge key={`${row.artist}-${row.title}-${playlist}`} variant="secondary" className="text-xs">
                          {playlist}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!searchError && !searching && searchResults.length === 0 && search.trim().length > 0 && (
          <p className="text-sm text-muted-foreground">No tracks found for this search.</p>
        )}
      </div>
    </div>
  );
}
