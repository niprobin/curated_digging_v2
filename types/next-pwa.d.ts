declare module "next-pwa" {
  import type { NextConfig } from "next";

  type Handler = "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate" | "NetworkOnly" | "CacheOnly";

  type RuntimeCachingEntry = {
    urlPattern: RegExp | string;
    handler: Handler;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    options?: {
      cacheName?: string;
      cacheableResponse?: {
        statuses?: number[];
        headers?: Record<string, string>;
      };
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      backgroundSync?: {
        name: string;
        options?: {
          maxRetentionTime?: number;
        };
      };
      matchOptions?: {
        ignoreSearch?: boolean;
        ignoreMethod?: boolean;
        ignoreVary?: boolean;
      };
      networkTimeoutSeconds?: number;
    };
  };

  type WithPwa = (
    options?: Partial<{
      dest: string;
      disable: boolean;
      register: boolean;
      skipWaiting: boolean;
      runtimeCaching: RuntimeCachingEntry[];
      fallbacks: Record<string, string>;
      mode: "production" | "development";
    }>,
  ) => (config: NextConfig) => NextConfig;

  const withPWA: WithPwa;
  export default withPWA;
}
