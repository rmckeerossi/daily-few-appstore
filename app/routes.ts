import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { stencilAuthRoutes } from "./.stencil/react-router/auth/routes";
import { stencilMcpRoutes } from "./.stencil/react-router/mcp/routes";

export default [
  index("routes/home.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("library", "routes/app.library.tsx"),
    route("decks/:id", "routes/app.decks.$id.tsx"),
    route("draw", "routes/app.draw.tsx"),
    route("answer", "routes/app.answer.tsx"),
    route("history", "routes/app.history.tsx"),
    route("profile", "routes/app.profile.tsx"),
  ]),
  route("api/files/*", "routes/api.files.$.tsx"),
  // Trusted route the platform calls to run recurring actions (bearer-gated).
  // Keep it registered at this path.
  route("api/internal/scheduled", "routes/api.internal.scheduled.tsx"),
  // Trusted route the platform calls after deploy to verify payments is wired
  // up correctly (bearer-gated). Keep it registered.
  route("api/internal/payments-probe", "routes/api.internal.payments-probe.tsx"),
  // Trusted route the platform calls when a video render finishes (bearer-gated).
  // Keep it registered if the app renders video; remove it otherwise.
  route("api/internal/remotion-complete", "routes/api.internal.remotion-complete.tsx"),
  // Stencil auth route pack. Keep it registered even for a public-only app —
  // its files only type-check when these routes are registered, and an unused
  // /login costs nothing at runtime.
  ...stencilAuthRoutes,
  // Stencil MCP OAuth route pack (discovery documents + consent page).
  ...stencilMcpRoutes,
  // LAST, and it must stay last: it matches every path nothing above did.
  // Redirects the pages the dispatcher owns and 404s for everything else.
  route("*", ".stencil/react-router/catch-all/route.tsx"),
] satisfies RouteConfig;
