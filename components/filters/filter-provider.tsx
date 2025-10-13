"use client";

import * as React from "react";
import {
  defaultFilters,
  filterReducer,
  type FilterAction,
  type FilterState,
} from "@/lib/filters";

const STORAGE_KEY = "curated-digging:filters";

type FilterContextValue = {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
};

const FilterContext = React.createContext<FilterContextValue | undefined>(
  undefined,
);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(filterReducer, defaultFilters);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FilterState>;
        dispatch({ type: "hydrate", payload: parsed });
      }
    } catch (error) {
      console.warn("Failed to restore filters", error);
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist filters", error);
    }
  }, [state]);

  const value = React.useMemo(() => ({ state, dispatch }), [state]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const context = React.useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
