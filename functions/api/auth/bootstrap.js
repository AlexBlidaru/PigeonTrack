import { json, errorJson, createPasswordHash, newSessionToken, sessionCookieHeader, SESSION_TTL_SECONDS } from "../../_lib/auth.js";

// POST /api/auth/bootstrap { username, password }
// Only works while the users table is empty - creates the first (admin) account.
export async function onRequestPost(context) {
  const { request, env } = context;
  const countRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (countRow && countRow.n > 0) {
    return errorJson("Contul a fost deja creat. Foloseste ecranul de autentificare.", 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const username = (body.username || "").trim();
  const password = body.password || "";
  if (username.length < 3) return errorJson("Numele de utilizator trebuie sa aiba minim 3 caractere");
  if (password.length < 6) return errorJson("Parola trebuie sa aiba minim 6 caractere");

  const { salt, hash } = await createPasswordHash(password);
  const result = await env.DB.prepare(
    "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)"
  )
    .bind(username, hash, salt)
    .run();

  const userId = result.meta.last_row_id;
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();

  return json(
    { ok: true, username },
    { headers: { "Set-Cookie": sessionCookieHeader(token, SESSION_TTL_SECONDS) } }
  );
}
