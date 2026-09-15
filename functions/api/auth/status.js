import { json, getUserFromRequest } from "../../_lib/auth.js";

// GET /api/auth/status -> tells the client whether setup (bootstrap) is needed
// and whether the current request is already authenticated.
export async function onRequestGet(context) {
  const { env, request } = context;
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  const needsSetup = !row || row.n === 0;
  const user = needsSetup ? null : await getUserFromRequest(request, env);
  return json({
    needsSetup,
    authenticated: !!user,
    username: user ? user.username : null,
  });
}
