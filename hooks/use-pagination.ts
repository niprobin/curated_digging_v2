import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Options for configuring resize-based pagination
 */
interface UseResizePaginationOptions {
  /** Minimum number of items per page */
  minPageSize?: number;
  /** Maximum number of items per page */
  maxPageSize?: number;
  /** Fallback height when container ref is not available */
  fallbackHeight?: number;
}

/**
 * Return type for the useResizePagination hook
 */
export interface UseResizePaginationReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current page size (number of items per page) */
  pageSize: number;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Starting index for the current page (0-indexed) */
  startIndex: number;
  /** Ending index for the current page (exclusive) */
  endIndex: number;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  prevPage: () => void;
  /** Go to a specific page number */
  goToPage: (page: number) => void;
  /** Reset to the first page */
  resetToFirstPage: () => void;
}

/**
 * Custom hook for responsive pagination that adjusts page size based on container height
 *
 * This hook uses ResizeObserver to detect changes in the container size and
 * automatically calculates the optimal number of items to show per page.
 *
 * @param totalItems - Total number of items to paginate
 * @param estimatedItemHeight - Estimated height of each item in pixels
 * @param options - Configuration options
 * @returns Pagination state and controls
 *
 * @example
 * ```tsx
 * const pagination = useResizePagination(filteredItems.length, 72, {
 *   minPageSize: 5,
 *   maxPageSize: 25,
 * });
 *
 * const paged = filteredItems.slice(pagination.startIndex, pagination.endIndex);
 *
 * return (
 *   <div>
 *     <div ref={pagination.containerRef}>
 *       {paged.map(item => <Item key={item.id} {...item} />)}
 *     </div>
 *     <Pagination {...pagination} />
 *   </div>
 * );
 * ```
 */
export function useResizePagination(
  totalItems: number,
  estimatedItemHeight: number,
  options: UseResizePaginationOptions = {}
): UseResizePaginationReturn {
  const { minPageSize = 5, maxPageSize = 25, fallbackHeight = 500 } = options;

  const [pageSize, setPageSize] = useState(minPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute page size based on container height
  const recomputePageSize = useCallback(
    (height: number) => {
      const rows = Math.floor(height / estimatedItemHeight);
      const clamped = Number.isFinite(rows)
        ? Math.max(minPageSize, Math.min(maxPageSize, rows))
        : minPageSize;

      setPageSize((prev) => (prev === clamped ? prev : clamped));
    },
    [estimatedItemHeight, minPageSize, maxPageSize]
  );

  // Set up ResizeObserver to watch container size changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = containerRef.current;
    if (!el) {
      // Use fallback height if no container ref
      recomputePageSize(fallbackHeight);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        recomputePageSize(entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [recomputePageSize, fallbackHeight]);

  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Ensure current page doesn't exceed total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    },
    [totalPages]
  );

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    containerRef,
    pageSize,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    nextPage,
    prevPage,
    goToPage,
    resetToFirstPage,
  };
}

/**
 * Custom hook for simple pagination without resize behavior
 *
 * Use this when you want fixed page size regardless of container size.
 *
 * @param totalItems - Total number of items to paginate
 * @param pageSize - Fixed number of items per page
 * @returns Pagination state and controls
 *
 * @example
 * ```tsx
 * const pagination = useSimplePagination(items.length, 10);
 * const paged = items.slice(pagination.startIndex, pagination.endIndex);
 * ```
 */
export function useSimplePagination(totalItems: number, pageSize: number) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    },
    [totalPages]
  );

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    pageSize,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    nextPage,
    prevPage,
    goToPage,
    resetToFirstPage,
  };
}
