import { json, errorJson } from "../../../../_lib/auth.js";

const FIELDS = ["arrival_time", "speed_m_min", "rank_position", "coefficient", "prize", "notes"];

function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
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
  await env.DB.prepare(`UPDATE event_participants SET ${setClause} WHERE id = ? AND event_id = ?`)
    .bind(...cols.map((c) => data[c]), params.pid, params.id)
    .run();
  const updated = await env.DB.prepare("SELECT * FROM event_participants WHERE id = ?").bind(params.pid).first();
  if (!updated) return errorJson("Inregistrarea nu a fost gasita", 404);
  return json(updated);
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  await env.DB.prepare("DELETE FROM event_participants WHERE id = ? AND event_id = ?").bind(params.pid, params.id).run();
  return json({ ok: true });
}
