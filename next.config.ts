import type { NextConfig } from "next";
import withPWA from "next-pwa";
import runtimeCaching from "./lib/pwa-runtime-caching";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["clsx", "tailwind-merge"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
  runtimeCaching,
  fallbacks: {
    document: "/offline",
  },
  mode: "production",
})(nextConfig);
