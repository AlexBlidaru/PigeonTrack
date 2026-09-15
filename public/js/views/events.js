import { api } from "../api.js";
import { fmtDate, fmtMoney, esc, toast, confirmDialog, openModal, ICONS, EVENT_CATEGORIES } from "../utils.js";

function categoryLabel(value) {
  const found = EVENT_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value || "-";
}

export async function renderEvents(root, hash) {
  const idMatch = hash.match(/^#\/events\/(\d+)/);
  if (idMatch) await renderDetail(root, Number(idMatch[1]));
  else await renderList(root);
}

async function renderList(root) {
  const events = await api.getEvents();
  root.innerHTML = `
    <div class="page-header">
      <h1>Concursuri</h1>
      <button class="btn" id="add-event-btn">${ICONS.plus} Concurs nou</button>
    </div>
    ${
      events.length === 0
        ? `<div class="empty-state">${ICONS.event}<p>Nu ai adaugat inca niciun concurs.</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr><th>Concurs</th><th>Data</th><th>Categorie</th><th>Locatie lansare</th><th>Distanta</th><th>Porumbei inscrisi</th></tr></thead>
          <tbody>${events
            .map(
              (e) => `<tr class="clickable-row" data-id="${e.id}" style="cursor:pointer">
              <td>${esc(e.name)}</td>
              <td>${fmtDate(e.event_date)}</td>
              <td>${categoryLabel(e.category)}</td>
              <td>${esc(e.release_location || "-")}</td>
              <td>${e.distance_km ? e.distance_km + " km" : "-"}</td>
              <td>${e.entered_count}${e.total_pigeons ? " / " + e.total_pigeons : ""}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table></div>`
    }
  `;
  root.querySelectorAll(".clickable-row").forEach((row) => {
    row.addEventListener("click", () => (window.location.hash = `#/events/${row.dataset.id}`));
  });
  root.querySelector("#add-event-btn").addEventListener("click", () => openEventForm(null, () => renderList(root)));
}

function rankBadge(rank) {
  if (!rank) return "-";
  const cls = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
  return `<span class="rank-badge ${cls}">${rank}</span>`;
}

async function renderDetail(root, id) {
  const event = await api.getEvent(id);
  const pigeons = await api.getPigeons();
  const enteredIds = new Set(event.participants.map((p) => p.pigeon_id));
  const available = pigeons.filter((p) => !enteredIds.has(p.id));

  root.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/events" class="link-btn">&larr; Inapoi la concursuri</a>
        <h1 style="margin-top:6px">${esc(event.name)}</h1>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn secondary" id="edit-event-btn">${ICONS.edit} Editeaza</button>
        <button class="btn danger" id="delete-event-btn">${ICONS.trash} Sterge</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="value">${fmtDate(event.event_date)}</div><div class="label">Data</div></div>
      <div class="stat-card"><div class="value">${categoryLabel(event.category)}</div><div class="label">Categorie</div></div>
      <div class="stat-card"><div class="value">${event.distance_km ? event.distance_km + " km" : "-"}</div><div class="label">Distanta</div></div>
      <div class="stat-card"><div class="value">${fmtMoney(event.entry_cost)}</div><div class="label">Cost participare</div></div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div class="kv-list">
        <div class="kv"><span>Locatie lansare</span><span>${esc(event.release_location || "-")}</span></div>
        <div class="kv"><span>Ora lansare</span><span>${esc(event.release_time || "-")}</span></div>
        <div class="kv"><span>Conditii meteo</span><span>${esc(event.weather || "-")}</span></div>
        <div class="kv"><span>Total porumbei in concurs</span><span>${event.total_pigeons ?? "-"}</span></div>
        <div class="kv"><span>Total crescatori</span><span>${event.total_lofts ?? "-"}</span></div>
      </div>
      ${event.notes ? `<p style="margin-top:12px;white-space:pre-wrap">${esc(event.notes)}</p>` : ""}
    </div>

    <div class="page-header">
      <h2 style="font-size:1.1rem;margin:0">Porumbei inscrisi</h2>
      <button class="btn secondary small" id="add-participant-btn">${ICONS.plus} Inscrie porumbel</button>
    </div>
    ${
      event.participants.length === 0
        ? `<div class="empty-state">${ICONS.pigeon}<p>Niciun porumbel inscris inca.</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr><th>Loc</th><th>Porumbel</th><th>Ora sosire</th><th>Viteza (m/min)</th><th>Coeficient</th><th>Premiu</th><th></th></tr></thead>
          <tbody>${event.participants
            .map(
              (p) => `<tr data-pid="${p.id}">
              <td>${rankBadge(p.rank_position)}</td>
              <td>${esc(p.pigeon_name || p.ring_number || "#" + p.pigeon_id)}</td>
              <td>${esc(p.arrival_time || "-")}</td>
              <td>${p.speed_m_min ? Number(p.speed_m_min).toFixed(0) : "-"}</td>
              <td>${p.coefficient ? Number(p.coefficient).toFixed(2) + "%" : "-"}</td>
              <td>${esc(p.prize || "-")}</td>
              <td style="display:flex;gap:6px;">
                <button class="icon-btn edit-participant" title="Editeaza rezultat">${ICONS.edit}</button>
                <button class="icon-btn remove-participant" title="Scoate din concurs">${ICONS.trash}</button>
              </td>
            </tr>`
            )
            .join("")}</tbody>
        </table></div>`
    }
  `;

  root.querySelector("#edit-event-btn").addEventListener("click", () => openEventForm(event, () => renderDetail(root, id)));
  root.querySelector("#delete-event-btn").addEventListener("click", async () => {
    if (!confirmDialog(`Sigur vrei sa stergi concursul "${event.name}"?`)) return;
    await api.deleteEvent(id);
    toast("Concurs sters", "success");
    window.location.hash = "#/events";
  });
  root.querySelector("#add-participant-btn").addEventListener("click", () => openParticipantForm(id, available, null, () => renderDetail(root, id)));
  root.querySelectorAll(".edit-participant").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const pid = e.target.closest("tr").dataset.pid;
      const participant = event.participants.find((p) => String(p.id) === pid);
      openParticipantForm(id, available, participant, () => renderDetail(root, id));
    });
  });
  root.querySelectorAll(".remove-participant").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const pid = e.target.closest("tr").dataset.pid;
      if (!confirmDialog("Scoti porumbelul din acest concurs?")) return;
      await api.removeParticipant(id, pid);
      toast("Eliminat din concurs", "success");
      renderDetail(root, id);
    });
  });
}

async function openEventForm(existing, onDone) {
  const overlay = openModal({
    title: existing ? "Editeaza concurs" : "Concurs nou",
    bodyHtml: `
      <form id="event-form">
        <div class="form-row">
          <div class="field"><label>Nume concurs *</label><input id="ef-name" value="${esc(existing?.name || "")}" required /></div>
          <div class="field"><label>Data *</label><input type="date" id="ef-date" value="${existing?.event_date ? existing.event_date.slice(0, 10) : ""}" required /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Categorie</label>
            <select id="ef-category"><option value="">-</option>${EVENT_CATEGORIES.map((c) => `<option value="${c.value}" ${existing?.category === c.value ? "selected" : ""}>${c.label}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Locatie lansare</label><input id="ef-location" value="${esc(existing?.release_location || "")}" placeholder="ex: Ruse, Bulgaria" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Distanta (km)</label><input type="number" step="0.01" id="ef-distance" value="${existing?.distance_km ?? ""}" /></div>
          <div class="field"><label>Ora lansare</label><input type="time" id="ef-release-time" value="${existing?.release_time || ""}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Total porumbei in concurs</label><input type="number" id="ef-total-pigeons" value="${existing?.total_pigeons ?? ""}" /></div>
          <div class="field"><label>Total crescatori</label><input type="number" id="ef-total-lofts" value="${existing?.total_lofts ?? ""}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Cost participare (RON)</label><input type="number" step="0.01" id="ef-entry-cost" value="${existing?.entry_cost ?? ""}" /></div>
          <div class="field"><label>Conditii meteo</label><input id="ef-weather" value="${esc(existing?.weather || "")}" placeholder="ex: vant din spate, senin" /></div>
        </div>
        <div class="field"><label>Notite</label><textarea id="ef-notes">${esc(existing?.notes || "")}</textarea></div>
      </form>
    `,
    footerHtml: `<button class="btn secondary" data-close-modal type="button">Anuleaza</button><button class="btn" id="ef-save">Salveaza</button>`,
  });

  overlay.querySelector("#ef-save").addEventListener("click", async () => {
    const name = overlay.querySelector("#ef-name").value.trim();
    const event_date = overlay.querySelector("#ef-date").value;
    if (!name || !event_date) {
      toast("Numele si data sunt obligatorii", "error");
      return;
    }
    const payload = {
      name,
      event_date,
      category: overlay.querySelector("#ef-category").value,
      release_location: overlay.querySelector("#ef-location").value.trim(),
      distance_km: overlay.querySelector("#ef-distance").value || null,
      release_time: overlay.querySelector("#ef-release-time").value,
      total_pigeons: overlay.querySelector("#ef-total-pigeons").value || null,
      total_lofts: overlay.querySelector("#ef-total-lofts").value || null,
      entry_cost: overlay.querySelector("#ef-entry-cost").value || null,
      weather: overlay.querySelector("#ef-weather").value.trim(),
      notes: overlay.querySelector("#ef-notes").value.trim(),
    };
    try {
      if (existing) await api.updateEvent(existing.id, payload);
      else await api.createEvent(payload);
      overlay.close();
      toast("Concurs salvat", "success");
      onDone && onDone();
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

async function openParticipantForm(eventId, availablePigeons, existing, onDone) {
  const overlay = openModal({
    title: existing ? "Editeaza rezultat" : "Inscrie porumbel in concurs",
    bodyHtml: `
      <form id="part-form">
        ${
          existing
            ? ""
            : `<div class="field"><label>Porumbel *</label>
                <select id="pt-pigeon">${availablePigeons.map((p) => `<option value="${p.id}">${p.name || p.ring_number || "#" + p.id}</option>`).join("") || '<option value="">Niciun porumbel disponibil</option>'}</select>
              </div>`
        }
        <div class="form-row">
          <div class="field"><label>Ora sosire</label><input type="time" id="pt-arrival" value="${existing?.arrival_time || ""}" /></div>
          <div class="field"><label>Viteza (m/min)</label><input type="number" step="0.01" id="pt-speed" value="${existing?.speed_m_min ?? ""}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Loc / pozitie</label><input type="number" id="pt-rank" value="${existing?.rank_position ?? ""}" /></div>
          <div class="field"><label>Coeficient (%)</label><input type="number" step="0.0001" id="pt-coef" value="${existing?.coefficient ?? ""}" /></div>
        </div>
        <div class="field"><label>Premiu</label><input id="pt-prize" value="${esc(existing?.prize || "")}" /></div>
        <div class="field"><label>Notite</label><textarea id="pt-notes">${esc(existing?.notes || "")}</textarea></div>
      </form>
    `,
    footerHtml: `<button class="btn secondary" data-close-modal type="button">Anuleaza</button><button class="btn" id="pt-save">Salveaza</button>`,
  });

  overlay.querySelector("#pt-save").addEventListener("click", async () => {
    const payload = {
      arrival_time: overlay.querySelector("#pt-arrival").value,
      speed_m_min: overlay.querySelector("#pt-speed").value || null,
      rank_position: overlay.querySelector("#pt-rank").value || null,
      coefficient: overlay.querySelector("#pt-coef").value || null,
      prize: overlay.querySelector("#pt-prize").value.trim(),
      notes: overlay.querySelector("#pt-notes").value.trim(),
    };
    try {
      if (existing) {
        await api.updateParticipant(eventId, existing.id, payload);
      } else {
        const pigeonSelect = overlay.querySelector("#pt-pigeon");
        if (!pigeonSelect || !pigeonSelect.value) {
          toast("Selecteaza un porumbel", "error");
          return;
        }
        payload.pigeon_id = pigeonSelect.value;
        await api.addParticipant(eventId, payload);
      }
      overlay.close();
      toast("Rezultat salvat", "success");
      onDone && onDone();
    } catch (err) {
      toast(err.message, "error");
    }
  });
}
