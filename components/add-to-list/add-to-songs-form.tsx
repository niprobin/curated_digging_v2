"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PLAYLIST_OPTIONS } from "@/components/playlist/playlist-options";

const ADD_SONG_WEBHOOK = "https://n8n.niprobin.com/webhook/add-song";

export function AddToSongsForm() {
  const [value, setValue] = React.useState("");
  const [playlist, setPlaylist] = React.useState<string>(PLAYLIST_OPTIONS[0] ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim() || !playlist) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(ADD_SONG_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "song-name": value.trim(), playlist }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      setValue("");
      setSuccess(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-foreground" htmlFor="song-name">
        Song name
      </label>
      <input
        id="song-name"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-border bg-card p-2 text-sm outline-none focus:border-primary"
        placeholder="e.g. Artist - Song"
      />
      <label className="block text-sm font-medium text-foreground" htmlFor="playlist-select">
        Playlist
      </label>
      <select
        id="playlist-select"
        value={playlist}
        onChange={(e) => setPlaylist(e.target.value)}
        className="w-full rounded-md border border-border bg-card p-2 text-sm outline-none focus:border-primary"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {PLAYLIST_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      {success && <p className="text-sm text-emerald-500">Song sent to your workflow.</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setValue("")} disabled={submitting}>
          Clear
        </Button>
        <Button type="submit" disabled={!value.trim() || !playlist || submitting}>
          {submitting ? "Sending..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
