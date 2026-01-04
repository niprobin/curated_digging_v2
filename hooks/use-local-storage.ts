import { useState, useEffect, useCallback } from "react";

/**
 * Options for the useLocalStorage hook
 */
interface UseLocalStorageOptions<T> {
  /** Custom serialization function (defaults to JSON.stringify) */
  serialize?: (value: T) => string;
  /** Custom deserialization function (defaults to JSON.parse) */
  deserialize?: (value: string) => T;
}

/**
 * Custom hook for managing state synchronized with localStorage
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no stored value exists
 * @param options - Optional serialize/deserialize functions
 * @returns A stateful value and a function to update it
 *
 * @example
 * ```tsx
 * const [count, setCount] = useLocalStorage('count', 0);
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options;

  // Initialize state from localStorage or use initial value
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
      // Silently fail for quota exceeded, incognito mode, etc.
    }
  }, [key, state, serialize]);

  return [state, setState];
}

/**
 * Custom hook for managing a Set<string> synchronized with localStorage
 *
 * This is a specialized version of useLocalStorage optimized for Set<string>
 * which is commonly used for tracking IDs (dismissed, bookmarked, etc.)
 *
 * @param key - The localStorage key to use
 * @returns A Set and a function to update it
 *
 * @example
 * ```tsx
 * const [bookmarkedIds, setBookmarkedIds] = useLocalStorageSet('bookmarks');
 *
 * // Add an ID
 * setBookmarkedIds(prev => {
 *   const next = new Set(prev);
 *   next.add('some-id');
 *   return next;
 * });
 *
 * // Remove an ID
 * setBookmarkedIds(prev => {
 *   const next = new Set(prev);
 *   next.delete('some-id');
 *   return next;
 * });
 * ```
 */
export function useLocalStorageSet(
  key: string
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  return useLocalStorage(key, new Set<string>(), {
    serialize: (set) => JSON.stringify(Array.from(set)),
    deserialize: (str) => {
      const parsed = JSON.parse(str);
      // Validate that it's an array of strings
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((id): id is string => typeof id === "string");
        return new Set(cleaned);
      }
      return new Set<string>();
    },
  });
}

/**
 * Custom hook for managing a boolean flag synchronized with localStorage
 *
 * This is a specialized version of useLocalStorage for boolean values
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial boolean value
 * @returns A boolean and a function to update it
 *
 * @example
 * ```tsx
 * const [showBookmarkedOnly, setShowBookmarkedOnly] = useLocalStorageBoolean('show-bookmarked', false);
 * ```
 */
export function useLocalStorageBoolean(
  key: string,
  initialValue: boolean = false
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => (value ? "true" : "false"),
    deserialize: (str) => str === "true",
  });
}
