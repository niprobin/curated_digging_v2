declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPwa = (
    options?: Partial<{
      dest: string;
      disable: boolean;
      register: boolean;
      skipWaiting: boolean;
      fallbacks: Record<string, string>;
      mode: "production" | "development";
    }>,
  ) => (config: NextConfig) => NextConfig;

  const withPWA: WithPwa;
  export default withPWA;
}
