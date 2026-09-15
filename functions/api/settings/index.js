import { json, errorJson } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const out = {};
  for (const row of results) out[row.key] = row.value;
  return json(out);
}

// PUT /api/settings - merge/overwrite key-value pairs.
export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const entries = Object.entries(body);
  for (const [key, value] of entries) {
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
      .bind(key, String(value))
      .run();
  }
  return json({ ok: true });
}
