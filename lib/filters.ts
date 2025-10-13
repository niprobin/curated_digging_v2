export type TimeWindow = "week" | "two_weeks" | "month" | "all";

export const timeWindowOptions: { value: TimeWindow; label: string; days?: number }[] = [
  { value: "week", label: "Last week", days: 7 },
  { value: "two_weeks", label: "Last 2 weeks", days: 14 },
  { value: "month", label: "Last month", days: 30 },
  { value: "all", label: "All", days: undefined },
];

export function filterByTimeWindow(date: Date, window: TimeWindow) {
  if (window === "all") return true;
  const days = timeWindowOptions.find((opt) => opt.value === window)?.days ?? 0;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayInMs = 1000 * 60 * 60 * 24;
  return diff <= dayInMs * days;
}

export type FilterState = {
  timeWindow: TimeWindow;
  curator: string | null;
  hideChecked: boolean;
  showLikedOnly: boolean;
};

export const defaultFilters: FilterState = {
  timeWindow: "two_weeks",
  curator: null,
  hideChecked: true,
  showLikedOnly: false,
};

export type FilterAction =
  | { type: "set-time"; payload: TimeWindow }
  | { type: "set-curator"; payload: string | null }
  | { type: "toggle-hide-checked"; payload?: boolean }
  | { type: "toggle-liked-only"; payload?: boolean }
  | { type: "hydrate"; payload: Partial<FilterState> };

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "set-time":
      return { ...state, timeWindow: action.payload };
    case "set-curator":
      return { ...state, curator: action.payload };
    case "toggle-hide-checked": {
      const value = action.payload ?? !state.hideChecked;
      return { ...state, hideChecked: value };
    }
    case "toggle-liked-only": {
      const value = action.payload ?? !state.showLikedOnly;
      return { ...state, showLikedOnly: value };
    }
    case "hydrate":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}
