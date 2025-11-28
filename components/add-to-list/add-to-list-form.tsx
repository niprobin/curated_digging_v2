"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

const ADD_ALBUM_WEBHOOK = "https://n8n.niprobin.com/webhook/add-album";

export function AddToListForm() {
  const [value, setValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(ADD_ALBUM_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "album-name": value.trim() }),
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
      {success && <p className="text-sm text-emerald-500">Album sent to your workflow.</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="reset" variant="ghost" onClick={() => setValue("")} disabled={submitting}>
          Clear
        </Button>
        <Button type="submit" disabled={!value.trim() || submitting}>
          {submitting ? "Sending..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
