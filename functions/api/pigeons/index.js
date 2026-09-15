import { json, errorJson } from "../../_lib/auth.js";

const FIELDS = [
  "name", "species", "sex", "ring_number", "color", "hatch_date",
  "cost", "health_status", "notes", "photo_key", "category_id",
  "father_id", "mother_id", "status",
];

function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

// GET /api/pigeons - full list, used for both the roster view and pedigree building.
export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT p.*, c.name AS category_name, c.color AS category_color
     FROM pigeons p LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.created_at DESC`
  ).all();
  return json(results);
}

// POST /api/pigeons - create a new pigeon.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  const data = pick(body);
  if (!data.name && !data.ring_number) {
    return errorJson("Introdu cel putin numele sau seria porumbelului");
  }

  const cols = Object.keys(data);
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = `INSERT INTO pigeons (${cols.join(", ")}) VALUES (${placeholders})`;
  const result = await env.DB.prepare(stmt).bind(...cols.map((c) => data[c])).run();
  const created = await env.DB.prepare("SELECT * FROM pigeons WHERE id = ?").bind(result.meta.last_row_id).first();
  return json(created, { status: 201 });
}
