import type { Route } from "./+types/api.files.$";
import { createStorage, serveR2Object, imageTransformFromRequest } from "~stencil/storage";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const storage = createStorage(env);
  const key = params["*"];
  if (!key) throw new Response("Not found", { status: 404 });
  return serveR2Object(storage, key, request, {
    transform: imageTransformFromRequest(request, env),
  });
}
