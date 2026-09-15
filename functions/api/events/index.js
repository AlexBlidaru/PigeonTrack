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

// GET /api/events - list with participant counts.
export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT e.*, COUNT(ep.id) AS entered_count
     FROM events e LEFT JOIN event_participants ep ON ep.event_id = e.id
     GROUP BY e.id ORDER BY e.event_date DESC`
  ).all();
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
  const data = pick(body);
  if (!data.name || !data.event_date) return errorJson("Numele si data evenimentului sunt obligatorii");

  const cols = Object.keys(data);
  const stmt = `INSERT INTO events (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
  const result = await env.DB.prepare(stmt).bind(...cols.map((c) => data[c])).run();
  const created = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(result.meta.last_row_id).first();
  return json(created, { status: 201 });
}
