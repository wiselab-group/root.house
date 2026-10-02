"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// /share/[token] and /invite/[token] carry a secret in the path — anyone
// holding the URL can open the archive or join the family. The query string
// is dropped too (auth callbacks put tokens there). Vercel only ever sees
// the route shape, never the secret.
const TOKEN_ROUTE = /^\/(share|invite)\/[^/]+/;

function redactUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(TOKEN_ROUTE, "/$1/[token]");
  url.search = "";
  return url.toString();
}

function redact<T extends { url: string }>(event: T): T {
  return { ...event, url: redactUrl(event.url) };
}

/** Page views + real-user Core Web Vitals → Vercel dashboard. No-op locally. */
export function VercelTelemetry() {
  return (
    <>
      <Analytics beforeSend={redact} />
      <SpeedInsights beforeSend={redact} />
    </>
  );
}
