import { redirect } from "../http";
import { createAuth } from "./utils";

/**
 * Get the current session without redirecting. Returns null if unauthenticated.
 *
 * Use this in the root loader to make session data available to useOptionalAuthUser().
 */
export async function getSession(request: Request, env: Env) {
  const auth = createAuth(env, false, undefined, request);
  return await auth.api.getSession({ headers: request.headers });
}

/**
 * Confine a caller-supplied redirect target to this app's own origin. The value
 * is resolved by the URL parser and rejected unless it stays same-origin, which
 * catches absolute, protocol-relative (//host) and backslash forms a string test misses.
 */
export function safeReturnTo(
  raw: string | null | undefined,
  fallback = "/app",
): string {
  if (!raw) return fallback;
  const base = "https://app.invalid";
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  return url.pathname + url.search + url.hash;
}

/**
 * Require an authenticated session. Redirects to /login if unauthenticated.
 *
 * Usage in any route loader:
 *   const { user, session } = await requireAuth(request, context.cloudflare.env);
 */
export async function requireAuth(request: Request, env: Env) {
  const result = await getSession(request, env);
  if (!result) {
    const url = new URL(request.url);
    const returnTo = url.pathname + url.search;
    throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return result;
}
