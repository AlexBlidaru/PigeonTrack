import { json, errorJson } from "../../_lib/auth.js";

const FIELDS = [
  "name", "event_date", "category", "release_location", "distance_km",
  "release_time", "weather", "total_pigeons", "total_lofts", "entry_cost", "notes",
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
  const event = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(params.id).first();
  if (!event) return errorJson("Evenimentul nu a fost gasit", 404);

  const { results } = await env.DB.prepare(
    `SELECT ep.*, p.name AS pigeon_name, p.ring_number
     FROM event_participants ep JOIN pigeons p ON p.id = ep.pigeon_id
     WHERE ep.event_id = ?
     ORDER BY (ep.rank_position IS NULL), ep.rank_position ASC`
  )
    .bind(params.id)
    .all();

  return json({ ...event, participants: results });
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
  const cols = Object.keys(data);
  if (cols.length === 0) return errorJson("Nimic de actualizat");
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  await env.DB.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).bind(...cols.map((c) => data[c]), params.id).run();
  const updated = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(params.id).first();
  if (!updated) return errorJson("Evenimentul nu a fost gasit", 404);
  return json(updated);
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
