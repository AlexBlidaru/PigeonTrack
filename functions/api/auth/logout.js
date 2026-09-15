import { json, readSessionToken, clearSessionCookieHeader } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = readSessionToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
}
