"use client";

import { FilterProvider } from "@/components/filters/filter-provider";
import { LikedHistoryProvider } from "@/components/history/history-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <LikedHistoryProvider>{children}</LikedHistoryProvider>
    </FilterProvider>
  );
}
