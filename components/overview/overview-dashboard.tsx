"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function OverviewDashboard() {
  const totalItems = NAV_ITEMS.length;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
            <Card className="h-full border-border/70 transition-colors group-hover:border-primary group-hover:bg-card/80">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <i className={item.icon} aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">{item.label}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
