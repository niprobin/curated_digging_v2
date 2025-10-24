"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

const ADD_ALBUM_WEBHOOK = "https://n8n.niprobin.com/webhook/add-album";

export function AddAlbumButton() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(ADD_ALBUM_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "album-name": value.trim() }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      setOpen(false);
      setValue("");
    } catch (err) {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <i className="fa-solid fa-plus" aria-hidden />
        <span className="ml-2">Add an album</span>
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add album"
            className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Add an album</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the album name to send to your workflow.
            </p>
            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-foreground" htmlFor="album-name">
                Album name
              </label>
              <input
                id="album-name"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-md border border-border bg-card p-2 text-sm outline-none focus:border-primary"
                placeholder="e.g. Artist - Album"
                autoFocus
              />
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!value.trim() || submitting}>
                  {submitting ? "Sending..." : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

