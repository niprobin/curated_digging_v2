"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/refresh/refresh-button";
import { AddAlbumButton } from "@/components/albums/add-album-button";

const navItems = [
  { href: "/", label: "Overview", icon: "fa-solid fa-compass" },
  { href: "/playlists", label: "Tracks", icon: "fa-solid fa-music" },
  { href: "/albums", label: "Albums", icon: "fa-solid fa-compact-disc" },
  { href: "/history", label: "History", icon: "fa-solid fa-heart" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-14 flex-col items-center justify-between border-r border-border bg-background/95 py-3 md:w-16">
      <div className="flex flex-col items-center gap-4">
        <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-md text-primary" title="Curated Digging">
          <i className="fa-solid fa-record-vinyl" aria-hidden />
          <span className="sr-only">Curated Digging</span>
        </Link>
        <nav className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <i className={item.icon} aria-hidden />
                  <span className="sr-only">{item.label}</span>
                </Link>
                <span className="pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="group relative">
          <RefreshButton iconOnly tags={["playlists", "albums"]} />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            Refresh
          </span>
        </div>
        <div className="group relative">
          <AddAlbumButton iconOnly />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            Add album
          </span>
        </div>
      </div>
    </aside>
  );
}
