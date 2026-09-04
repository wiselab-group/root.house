import { signOut } from "@/lib/auth";

/**
 * Deliberately NOT nested under /api/auth/* — Auth.js's own catch-all route
 * handler (app/api/auth/[...nextauth]/route.ts) intercepts every request
 * under that prefix and tries to parse it as one of its own actions
 * (signin/signout/session/...), throwing "UnknownAction: Cannot parse
 * action" (a 400) for anything it doesn't recognize — including a sibling
 * custom route that happens to live under the same /api/auth/ path. Route
 * Handler (not a Server Component) so signOut() is allowed to clear the
 * session cookie — see (app)/layout.tsx's doc comment for why the
 * stale-session check redirects here instead of calling signOut() inline.
 */
export async function GET(): Promise<Response> {
  await signOut({ redirectTo: "/login?error=stale-session" });
  // signOut() with redirectTo throws a NEXT_REDIRECT internally and never
  // reaches here in practice, but TypeScript wants every path to return.
  return new Response(null, {
    status: 302,
    headers: { Location: "/login?error=stale-session" },
  });
}
