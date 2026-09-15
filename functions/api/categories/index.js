import { json, errorJson } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
  return json(results);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const name = (body.name || "").trim();
  if (!name) return errorJson("Numele categoriei este obligatoriu");
  const color = body.color || "#6b8f47";
  const result = await env.DB.prepare("INSERT INTO categories (name, color) VALUES (?, ?)").bind(name, color).run();
  return json({ id: result.meta.last_row_id, name, color }, { status: 201 });
}
