"use client";

import * as React from "react";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { timeWindowOptions } from "@/lib/filters";
import { cn } from "@/lib/utils";

interface FilterToolbarProps {
  curators?: string[];
  showCuratorFilter?: boolean;
  showTimeWindow?: boolean;
  onCuratorChange?: (value: string | null) => void;
}

export function FilterToolbar({
  curators = [],
  showCuratorFilter = false,
  showTimeWindow = true,
  onCuratorChange,
}: FilterToolbarProps) {
  const {
    state: { timeWindow, curator },
    dispatch,
  } = useFilters();

  const sortedCurators = React.useMemo(
    () =>
      [...curators]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [curators],
  );

  const handleCuratorClick = (value: string) => {
    const next = curator === value ? null : value;
    dispatch({ type: "set-curator", payload: next });
    onCuratorChange?.(next);
  };

  const blocks: React.ReactNode[] = [];

  if (showTimeWindow) {
    blocks.push(
      <div key="time" className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Time window</span>
        <div className="flex flex-wrap gap-1">
          {timeWindowOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={timeWindow === option.value ? "default" : "outline"}
              className={cn("capitalize", timeWindow === option.value && "shadow-focus")}
              onClick={() => dispatch({ type: "set-time", payload: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>,
    );
  }

  if (showCuratorFilter && sortedCurators.length > 0) {
    blocks.push(
      <div key="curator" className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Curator</span>
        <div className="flex flex-wrap items-center gap-1">
          {sortedCurators.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={curator === name ? "secondary" : "outline"}
              onClick={() => handleCuratorClick(name)}
            >
              {name}
            </Button>
          ))}
          {curator && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => handleCuratorClick(curator)}
            >
              Clear
            </Button>
          )}
        </div>
      </div>,
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
      {blocks}
    </div>
  );
}
