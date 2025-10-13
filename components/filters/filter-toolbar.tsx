"use client";

import * as React from "react";
import { useFilters } from "@/components/filters/filter-provider";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { timeWindowOptions } from "@/lib/filters";
import { cn } from "@/lib/utils";

interface FilterToolbarProps {
  curators?: string[];
  showCuratorFilter?: boolean;
  onCuratorChange?: (value: string | null) => void;
}

export function FilterToolbar({
  curators = [],
  showCuratorFilter = false,
  onCuratorChange,
}: FilterToolbarProps) {
  const {
    state: { timeWindow, curator, hideChecked, showLikedOnly },
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Time window</span>
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          pressed={hideChecked}
          onPressedChange={(pressed) =>
            dispatch({ type: "toggle-hide-checked", payload: pressed })
          }
        >
          Hide checked
        </Toggle>
        <Toggle
          pressed={showLikedOnly}
          onPressedChange={(pressed) =>
            dispatch({ type: "toggle-liked-only", payload: pressed })
          }
        >
          Show liked only
        </Toggle>
        {showCuratorFilter && sortedCurators.length > 0 && (
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
                Clear curator
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
