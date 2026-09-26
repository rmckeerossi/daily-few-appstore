import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hello World" },
    { name: "description", content: "Welcome to my app" },
  ];
}

// Stub copy is deliberately plain JSX, not <Text>: a build that rewrites
// strings.json must not invalidate a stub it hasn't replaced yet.
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-medium">Hello World</h1>
        <Link
          to="/app"
          className="mt-4 inline-block text-sm text-muted-foreground hover:underline"
        >
          Go to app
        </Link>
      </div>
    </div>
  );
}
