import { json, errorJson, verifyPassword, createPasswordHash, getUserFromRequest } from "../../_lib/auth.js";

// POST /api/auth/change-password { currentPassword, newPassword }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env);
  if (!user) return errorJson("Neautentificat", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const { currentPassword, newPassword } = body;
  if (!newPassword || newPassword.length < 6) return errorJson("Parola noua trebuie sa aiba minim 6 caractere");

  const row = await env.DB.prepare("SELECT salt, password_hash FROM users WHERE id = ?").bind(user.id).first();
  const ok = await verifyPassword(currentPassword || "", row.salt, row.password_hash);
  if (!ok) return errorJson("Parola curenta este gresita", 401);

  const { salt, hash } = await createPasswordHash(newPassword);
  await env.DB.prepare("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?").bind(salt, hash, user.id).run();
  return json({ ok: true });
}
