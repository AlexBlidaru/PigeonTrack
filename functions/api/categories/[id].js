import { json, errorJson } from "../../_lib/auth.js";

export async function onRequestPut(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const name = (body.name || "").trim();
  const color = body.color || "#6b8f47";
  if (!name) return errorJson("Numele categoriei este obligatoriu");
  await env.DB.prepare("UPDATE categories SET name = ?, color = ? WHERE id = ?").bind(name, color, params.id).run();
  return json({ id: Number(params.id), name, color });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
