import { getUserFromRequest, errorJson } from "./_lib/auth.js";

// Public API routes that don't require a session.
const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/bootstrap",
  "/api/auth/status",
]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) {
    return next();
  }
  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return errorJson("Neautentificat", 401);
  }
  context.data.user = user;
  return next();
}
