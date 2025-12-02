type Handler = "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate";

type RuntimeCachingEntry = {
  urlPattern: RegExp | string;
  handler: Handler;
  method?: "GET" | "POST";
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

const STATUSES_OK = [0, 200];

const runtimeCaching: RuntimeCachingEntry[] = [
  {
    urlPattern: /^https:\/\/opensheet\.elk\.sh\/.*$/i,
    handler: "NetworkFirst",
    method: "GET",
    options: {
      cacheName: "opensheet-data",
      networkTimeoutSeconds: 8,
      cacheableResponse: {
        statuses: STATUSES_OK,
      },
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 5 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/i\.scdn\.co\/image\/.*/i,
    handler: "CacheFirst",
    method: "GET",
    options: {
      cacheName: "cover-art",
      cacheableResponse: {
        statuses: STATUSES_OK,
      },
      expiration: {
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/kit\.fontawesome\.com\/.*/i,
    handler: "StaleWhileRevalidate",
    method: "GET",
    options: {
      cacheName: "fontawesome-kit",
      cacheableResponse: {
        statuses: STATUSES_OK,
      },
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
    handler: "CacheFirst",
    method: "GET",
    options: {
      cacheName: "google-fonts",
      cacheableResponse: {
        statuses: STATUSES_OK,
      },
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https?:\/\/.+\/api\/.*$/i,
    handler: "NetworkFirst",
    method: "GET",
    options: {
      cacheName: "api-routes",
      cacheableResponse: {
        statuses: STATUSES_OK,
      },
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 5 * 60,
      },
      backgroundSync: {
        name: "api-queue",
        options: {
          maxRetentionTime: 5,
        },
      },
    },
  },
];

export default runtimeCaching;
