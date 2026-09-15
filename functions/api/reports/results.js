import { json } from "../../_lib/auth.js";

// GET /api/reports/results - flattened event results, joined with event + pigeon
// info, so the Reports view can filter/aggregate and build PDFs without N+1 calls.
export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT
       ep.id, ep.arrival_time, ep.speed_m_min, ep.rank_position, ep.coefficient, ep.prize, ep.notes,
       e.id AS event_id, e.name AS event_name, e.event_date, e.category AS event_category,
       e.release_location, e.distance_km, e.entry_cost, e.total_pigeons AS event_total_pigeons,
       p.id AS pigeon_id, p.name AS pigeon_name, p.ring_number, p.cost AS pigeon_cost, p.category_id
     FROM event_participants ep
     JOIN events e ON e.id = ep.event_id
     JOIN pigeons p ON p.id = ep.pigeon_id
     ORDER BY e.event_date DESC`
  ).all();
  return json(results);
}
