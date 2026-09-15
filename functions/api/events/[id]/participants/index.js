import { json, errorJson } from "../../../../_lib/auth.js";

// POST /api/events/:id/participants { pigeon_id, arrival_time?, speed_m_min?, rank_position?, coefficient?, prize?, notes? }
export async function onRequestPost(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson("Cerere invalida");
  }
  if (!body.pigeon_id) return errorJson("Selecteaza un porumbel");

  try {
    const result = await env.DB.prepare(
      `INSERT INTO event_participants (event_id, pigeon_id, arrival_time, speed_m_min, rank_position, coefficient, prize, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        params.id,
        body.pigeon_id,
        body.arrival_time || null,
        body.speed_m_min ?? null,
        body.rank_position ?? null,
        body.coefficient ?? null,
        body.prize || null,
        body.notes || null
      )
      .run();
    const created = await env.DB.prepare("SELECT * FROM event_participants WHERE id = ?").bind(result.meta.last_row_id).first();
    return json(created, { status: 201 });
  } catch (e) {
    if (String(e).includes("UNIQUE")) return errorJson("Porumbelul este deja inscris in acest eveniment");
    return errorJson("Nu am putut adauga porumbelul");
  }
}
