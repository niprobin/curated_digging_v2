"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  tag: "playlists" | "albums";
}

export function RefreshButton({ tag }: RefreshButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag }),
        });
        if (!res.ok) {
          throw new Error(`Revalidate failed (${res.status})`);
        }
        router.refresh();
      } catch (e) {
        setError("Refresh failed. Try again.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onClick} size="sm" variant="outline" disabled={pending}>
        <i className="fa-solid fa-rotate" aria-hidden />
        <span className="ml-2">{pending ? "Refreshing..." : "Refresh"}</span>
      </Button>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}

