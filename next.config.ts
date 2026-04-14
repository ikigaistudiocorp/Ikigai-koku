import type { NextConfig } from "next";
// @ts-expect-error — next-pwa has no bundled TS types compatible with Next 16.
import withPWAInit from "next-pwa";

const baseConfig: NextConfig = {
  reactStrictMode: true,
};

const isDev = process.env.NODE_ENV === "development";

// next-pwa injects a webpack config, which conflicts with Next 16's default
// Turbopack dev server. In development we skip the PWA wrapper entirely —
// the service worker is not needed for local iteration and `next dev` runs
// through Turbopack. Production builds use webpack and the PWA wrapper.
const config: NextConfig = isDev
  ? baseConfig
  : withPWAInit({
      dest: "public",
      register: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https?.*\/_next\/static\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "next-static",
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: /^https?.*\/api\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "image-cache",
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    })(baseConfig);

export default config;
