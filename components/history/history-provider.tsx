"use client";

import * as React from "react";

export type LikeableType = "track" | "album";

export interface LikeableItem {
  id: string;
  type: LikeableType;
  title: string;
  subtitle?: string;
  url?: string;
  artworkUrl?: string;
}

export interface LikedHistoryEntry extends LikeableItem {
  likedAt: string;
  unlikedAt?: string;
  active: boolean;
}

interface LikeContextValue {
  isLiked(id: string, base?: boolean): boolean;
  like(item: LikeableItem, base?: boolean): void;
  unlike(id: string, base?: boolean): void;
  history: LikedHistoryEntry[];
}

const STORAGE_KEY = "curated-digging:likes";

interface LikeState {
  overrides: Record<string, boolean>;
  history: Record<string, LikedHistoryEntry>;
}

const initialState: LikeState = {
  overrides: {},
  history: {},
};

const LikeContext = React.createContext<LikeContextValue | undefined>(undefined);

export function LikedHistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LikeState>(initialState);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LikeState;
        setState({
          overrides: parsed.overrides ?? {},
          history: parsed.history ?? {},
        });
      }
    } catch (error) {
      console.warn("Failed to restore liked history", error);
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist liked history", error);
    }
  }, [state]);

  const isLiked = React.useCallback(
    (id: string, base?: boolean) => {
      const override = state.overrides[id];
      return override ?? Boolean(base);
    },
    [state.overrides],
  );

  const like = React.useCallback(
    (item: LikeableItem, base?: boolean) => {
      setState((prev) => {
        const overrides = { ...prev.overrides };
        if (!base) {
          overrides[item.id] = true;
        } else {
          delete overrides[item.id];
        }
        const existing = prev.history[item.id];
        const nextEntry: LikedHistoryEntry = existing
          ? { ...existing, active: true, likedAt: existing.likedAt, unlikedAt: undefined }
          : {
              ...item,
              active: true,
              likedAt: new Date().toISOString(),
            };
        return {
          overrides,
          history: {
            ...prev.history,
            [item.id]: nextEntry,
          },
        };
      });
    },
    [],
  );

  const unlike = React.useCallback(
    (id: string, base?: boolean) => {
      setState((prev) => {
        const overrides = { ...prev.overrides };
        if (base) {
          overrides[id] = false;
        } else {
          delete overrides[id];
        }
        const existing = prev.history[id];
        const nextEntry = existing
          ? { ...existing, active: false, unlikedAt: new Date().toISOString() }
          : undefined;
        return {
          overrides,
          history: nextEntry
            ? {
                ...prev.history,
                [id]: nextEntry,
              }
            : prev.history,
        };
      });
    },
    [],
  );

  const value = React.useMemo<LikeContextValue>(() => {
    const historyEntries = Object.values(state.history).sort((a, b) =>
      (b.likedAt ?? "").localeCompare(a.likedAt ?? ""),
    );
    return {
      isLiked,
      like,
      unlike,
      history: historyEntries,
    };
  }, [isLiked, like, unlike, state.history]);

  return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
}

export function useLikedHistory() {
  const context = React.useContext(LikeContext);
  if (!context) {
    throw new Error("useLikedHistory must be used within a LikedHistoryProvider");
  }
  return context;
}
