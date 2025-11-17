"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [passcode, setPasscode] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const [redirectTo, setRedirectTo] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const u = new URL(window.location.href);
      setRedirectTo(u.searchParams.get("redirect"));
    } catch {}
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode, remember }),
        });
        if (!res.ok) throw new Error("Login failed");
        router.push(redirectTo || "/");
        router.refresh();
      } catch {
        setError("Invalid passcode");
      }
    });
  };

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-primary">
            <i className="fa-solid fa-record-vinyl" aria-hidden />
          </div>
          <h1 className="text-lg font-semibold">Curated Digging</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your passcode to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="passcode" className="text-sm font-medium">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full rounded-md border border-border bg-card p-2 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || !passcode}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
