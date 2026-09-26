import { route, type RouteConfigEntry } from "@react-router/dev/routes";

/**
 * The Stencil auth route pack: /logout and /api/auth/*.
 *
 * Spread into your routes config, with a RELATIVE path — React Router's
 * config loader runs before tsconfig aliases resolve:
 *
 *   import { stencilAuthRoutes } from "./.stencil/react-router/auth/routes";
 *
 *   export default [
 *     index("routes/home.tsx"),
 *     ...stencilAuthRoutes,
 *   ] satisfies RouteConfig;
 */
export const stencilAuthRoutes: RouteConfigEntry[] = [
  route("logout", ".stencil/react-router/auth/logout.tsx"),
  // Static path outranks the /api/auth/* splat below, so this never reaches
  // the Better Auth handler.
  route("api/auth/internal/grant-access", ".stencil/react-router/auth/grant-access.tsx"),
  route("api/auth/*", ".stencil/react-router/auth/api.auth.$.tsx"),
];
