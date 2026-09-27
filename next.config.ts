import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Finds src/i18n/request.ts — locale resolution without URL prefixes.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  // Lets a phone on the same local network reach the dev server (needed to
  // test on a real device, e.g. iPhone Safari) — wildcarded so it survives
  // switching Wi-Fi networks/routers instead of hardcoding today's IP. Only
  // takes effect in development; has no bearing on the deployed app.
  allowedDevOrigins: ["192.168.*.*"],
};

export default withNextIntl(nextConfig);
