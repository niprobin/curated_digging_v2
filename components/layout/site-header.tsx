"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: "fa-solid fa-compass" },
  { href: "/playlists", label: "Playlists", icon: "fa-solid fa-music" },
  { href: "/albums", label: "Albums", icon: "fa-solid fa-compact-disc" },
  { href: "/history", label: "History", icon: "fa-solid fa-heart" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <i className="fa-solid fa-record-vinyl text-primary" aria-hidden />
          <span>Curated Music</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <i className={item.icon} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
