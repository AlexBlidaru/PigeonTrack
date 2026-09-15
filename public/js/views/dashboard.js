import { api } from "../api.js";
import { fmtDate, fmtMoney, esc, ICONS } from "../utils.js";

export async function renderDashboard(root) {
  const [pigeons, events, results] = await Promise.all([api.getPigeons(), api.getEvents(), api.getResults()]);

  const activePigeons = pigeons.filter((p) => p.status !== "vandut" && p.status !== "pierdut" && p.status !== "decedat");
  const totalCost = pigeons.reduce((s, p) => s + (Number(p.cost) || 0), 0);
  const wins = results.filter((r) => Number(r.rank_position) === 1).length;
  const upcoming = [...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const now = new Date();
  const nextEvent = upcoming.find((e) => new Date(e.event_date) >= now);
  const recentResults = results.slice(0, 6);

  root.innerHTML = `
    <div class="page-header"><h1>Panou principal</h1></div>
    <div class="stat-grid">
      <div class="stat-card"><div class="value">${activePigeons.length}</div><div class="label">Porumbei activi</div></div>
      <div class="stat-card"><div class="value">${events.length}</div><div class="label">Concursuri inregistrate</div></div>
      <div class="stat-card"><div class="value">${wins}</div><div class="label">Locuri 1 obtinute</div></div>
      <div class="stat-card"><div class="value">${fmtMoney(totalCost)}</div><div class="label">Valoare investita in porumbei</div></div>
    </div>

    <div class="detail-grid" style="grid-template-columns: 1.3fr 1fr;">
      <div class="card">
        <h3>Ultimele rezultate</h3>
        ${
          recentResults.length === 0
            ? `<div class="empty-state">${ICONS.event}<p>Nu ai rezultate inregistrate inca.</p></div>`
            : `<div class="table-wrap"><table>
                <thead><tr><th>Concurs</th><th>Porumbel</th><th>Loc</th><th>Coeficient</th></tr></thead>
                <tbody>${recentResults
                  .map(
                    (r) => `<tr>
                      <td>${esc(r.event_name)}<div class="meta" style="color:var(--color-text-muted);font-size:0.78rem">${fmtDate(r.event_date)}</div></td>
                      <td>${esc(r.pigeon_name || r.ring_number || "-")}</td>
                      <td>${r.rank_position ? `#${r.rank_position}` : "-"}</td>
                      <td>${r.coefficient ? Number(r.coefficient).toFixed(2) + "%" : "-"}</td>
                    </tr>`
                  )
                  .join("")}</tbody>
              </table></div>`
        }
      </div>

      <div class="card">
        <h3>Urmatorul concurs</h3>
        ${
          nextEvent
            ? `<p><strong>${esc(nextEvent.name)}</strong></p>
               <p class="meta" style="color:var(--color-text-muted)">${fmtDate(nextEvent.event_date)} &middot; ${esc(nextEvent.release_location || "-")}</p>
               <p class="meta" style="color:var(--color-text-muted)">${nextEvent.distance_km ? nextEvent.distance_km + " km" : ""}</p>
               <a class="btn secondary small" href="#/events">Vezi toate concursurile</a>`
            : `<div class="empty-state">${ICONS.event}<p>Niciun concurs viitor programat.</p></div>`
        }
        <h3 style="margin-top:22px">Porumbei recenti</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${pigeons
            .slice(0, 4)
            .map(
              (p) => `<div style="display:flex;align-items:center;gap:10px;">
                <img src="${p.photo_data || "/icons/icon-192.png"}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" />
                <div><div style="font-weight:600">${esc(p.name || p.ring_number || "Fara nume")}</div>
                <div style="font-size:0.78rem;color:var(--color-text-muted)">${esc(p.ring_number || "")}</div></div>
              </div>`
            )
            .join("") || `<p class="meta" style="color:var(--color-text-muted)">Nu ai adaugat inca niciun porumbel.</p>`}
        </div>
      </div>
    </div>
  `;
}
