import { useState, useCallback } from "react";

/**
 * Options for the useWebhook hook
 */
interface UseWebhookOptions<TPayload, TResponse> {
  /** The webhook URL to call */
  url: string;
  /** HTTP method to use (defaults to POST) */
  method?: "GET" | "POST";
  /** Callback invoked when the webhook succeeds */
  onSuccess?: (response: TResponse) => void;
  /** Callback invoked when the webhook fails */
  onError?: (error: Error) => void;
}

/**
 * Return type for the useWebhook hook
 */
interface UseWebhookReturn<TPayload, TResponse> {
  /** Function to trigger the webhook */
  trigger: (payload?: TPayload) => Promise<TResponse>;
  /** Whether the webhook is currently loading */
  isLoading: boolean;
  /** Error from the last webhook call (if any) */
  error: Error | null;
}

/**
 * Custom hook for calling webhooks with loading and error states
 *
 * This hook standardizes webhook calls across the application, providing
 * consistent error handling and loading states.
 *
 * @param options - Configuration for the webhook
 * @returns Object with trigger function, loading state, and error state
 *
 * @example
 * ```tsx
 * const { trigger, isLoading, error } = useWebhook({
 *   url: WEBHOOKS.addToPlaylist,
 *   onSuccess: () => console.log('Success!'),
 *   onError: (err) => console.error('Failed:', err),
 * });
 *
 * const handleSubmit = async () => {
 *   try {
 *     await trigger({ playlist: 'Jazz', track: 'Song Name' });
 *   } catch (err) {
 *     // Error already captured in error state
 *   }
 * };
 * ```
 */
export function useWebhook<TPayload = unknown, TResponse = unknown>(
  options: UseWebhookOptions<TPayload, TResponse>
): UseWebhookReturn<TPayload, TResponse> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = useCallback(
    async (payload?: TPayload): Promise<TResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(options.url, {
          method: options.method || "POST",
          headers:
            options.method === "POST" || !options.method
              ? { "Content-Type": "application/json" }
              : undefined,
          body:
            (options.method === "POST" || !options.method) && payload
              ? JSON.stringify(payload)
              : undefined,
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        const data = (await response.json()) as TResponse;
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return { trigger, isLoading, error };
}

/**
 * Custom hook for GET webhooks with query parameters
 *
 * This is a specialized version of useWebhook for GET requests
 * where parameters are passed as query strings.
 *
 * @param url - The base webhook URL
 * @param options - Additional options
 * @returns Object with trigger function, loading state, and error state
 *
 * @example
 * ```tsx
 * const { trigger, isLoading } = useWebhookGet(WEBHOOKS.getTrackUrl);
 *
 * const fetchTrack = async (artist: string, track: string) => {
 *   const data = await trigger({ artist, track });
 *   return data;
 * };
 * ```
 */
export function useWebhookGet<TParams extends Record<string, string>, TResponse = unknown>(
  url: string,
  options: {
    onSuccess?: (response: TResponse) => void;
    onError?: (error: Error) => void;
  } = {}
): UseWebhookReturn<TParams, TResponse> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = useCallback(
    async (params?: TParams): Promise<TResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = params ? new URLSearchParams(params).toString() : "";
        const fullUrl = searchParams ? `${url}?${searchParams}` : url;

        const response = await fetch(fullUrl, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        const data = (await response.json()) as TResponse;
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [url, options]
  );

  return { trigger, isLoading, error };
}
