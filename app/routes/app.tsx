import { requireAuth } from "~stencil/auth/server";
import { AuthProvider } from "~stencil/ui/auth/context";
import { SignOutButton } from "~stencil/ui/auth/sign-out-button";
import type { Route } from "./+types/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  return { user };
}

// Stub copy is deliberately plain JSX, not <Text>: a build that rewrites
// strings.json must not invalidate a stub it hasn't replaced yet.
export default function AppHome({ loaderData }: Route.ComponentProps) {
  return (
    <AuthProvider user={loaderData.user}>
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium">Welcome, {loaderData.user.name || loaderData.user.email}</h1>
          <SignOutButton className="mt-4 inline-block text-sm text-muted-foreground hover:underline" />
        </div>
      </div>
    </AuthProvider>
  );
}
