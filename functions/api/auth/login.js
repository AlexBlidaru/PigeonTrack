import { json, errorJson, verifyPassword, newSessionToken, sessionCookieHeader, SESSION_TTL_SECONDS } from "../../_lib/auth.js";

// POST /api/auth/login { username, password }
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const username = (body.username || "").trim();
  const password = body.password || "";

  const user = await env.DB.prepare(
    "SELECT id, username, password_hash, salt FROM users WHERE username = ?"
  )
    .bind(username)
    .first();

  if (!user) return errorJson("Utilizator sau parola gresita", 401);
  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) return errorJson("Utilizator sau parola gresita", 401);

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expiresAt)
    .run();

  return json(
    { ok: true, username: user.username },
    { headers: { "Set-Cookie": sessionCookieHeader(token, SESSION_TTL_SECONDS) } }
  );
}
