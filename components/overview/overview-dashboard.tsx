"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { AddToListForm } from "@/components/add-to-list/add-to-list-form";
import { AddToSongsForm } from "@/components/add-to-list/add-to-songs-form";

export function OverviewDashboard() {
  const totalItems = NAV_ITEMS.length;
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
          <h2 className="text-lg font-semibold">Add to albums</h2>
          <AddToListForm />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add to songs</h2>
          <AddToSongsForm />
        </div>
      </div>
    </div>
  );
}
