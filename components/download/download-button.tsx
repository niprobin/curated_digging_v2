"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function DownloadButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/download", { method: "POST" });
        if (!res.ok) throw new Error("Download trigger failed");
      } catch {
        setError("Download failed. Try again.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onClick} size={iconOnly ? "icon" : "sm"} variant="outline" disabled={pending} title="Download">
        <i className="fa-solid fa-download" aria-hidden />
        {iconOnly ? (
          <span className="sr-only">Download</span>
        ) : (
          <span className="ml-2">{pending ? "Starting..." : "Download"}</span>
        )}
      </Button>
      {!iconOnly && error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
