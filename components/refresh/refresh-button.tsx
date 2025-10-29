"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Tag = "playlists" | "albums";

type RefreshButtonProps =
  | { tag: Tag; tags?: never }
  | { tags: Tag[]; tag?: never };

export function RefreshButton(props: RefreshButtonProps & { iconOnly?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const { iconOnly = false } = props as { iconOnly?: boolean };

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const tags = 'tag' in props ? [props.tag] : props.tags;
        if (!tags || tags.length === 0) throw new Error("Missing tags");
        for (const t of tags) {
          const res = await fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag: t }),
          });
          if (!res.ok) {
            throw new Error(`Revalidate failed (${res.status})`);
          }
        }
        router.refresh();
      } catch (e) {
        setError("Refresh failed. Try again.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onClick} size={iconOnly ? "icon" : "sm"} variant="outline" disabled={pending} title="Refresh">
        <i className="fa-solid fa-rotate" aria-hidden />
        {iconOnly ? (
          <span className="sr-only">Refresh</span>
        ) : (
          <span className="ml-2">{pending ? "Refreshing..." : "Refresh"}</span>
        )}
      </Button>
      {!iconOnly && error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
