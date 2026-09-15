import { json, errorJson } from "../../_lib/auth.js";

const FIELDS = [
  "name", "species", "sex", "ring_number", "color", "hatch_date",
  "cost", "health_status", "notes", "photo_data", "category_id",
  "father_id", "mother_id", "status",
];

function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const row = await env.DB.prepare(
    `SELECT p.*, c.name AS category_name, c.color AS category_color
     FROM pigeons p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`
  )
    .bind(params.id)
    .first();
  if (!row) return errorJson("Porumbelul nu a fost gasit", 404);

  const results = await env.DB.prepare(
    `SELECT ep.*, e.name AS event_name, e.event_date, e.category AS event_category, e.distance_km, e.release_location
     FROM event_participants ep JOIN events e ON e.id = ep.event_id
     WHERE ep.pigeon_id = ? ORDER BY e.event_date DESC`
  )
    .bind(params.id)
    .all();

  return json({ ...row, results: results.results });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const data = pick(body);
  if (String(data.father_id) === String(params.id) || String(data.mother_id) === String(params.id)) {
    return errorJson("Un porumbel nu poate fi propriul parinte");
  }
  const cols = Object.keys(data);
  if (cols.length === 0) return errorJson("Nimic de actualizat");

  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  await env.DB.prepare(`UPDATE pigeons SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...cols.map((c) => data[c]), params.id)
    .run();

  const updated = await env.DB.prepare("SELECT * FROM pigeons WHERE id = ?").bind(params.id).first();
  if (!updated) return errorJson("Porumbelul nu a fost gasit", 404);
  return json(updated);
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const row = await env.DB.prepare("SELECT id FROM pigeons WHERE id = ?").bind(params.id).first();
  if (!row) return errorJson("Porumbelul nu a fost gasit", 404);
  await env.DB.prepare("DELETE FROM pigeons WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
