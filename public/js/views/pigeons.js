import { api, photoUrl } from "../api.js";
import { fmtDate, fmtMoney, esc, toast, confirmDialog, openModal, compressImage, ICONS, PIGEON_STATUSES } from "../utils.js";

let cachedPigeons = null;
let cachedCategories = null;

async function loadData(force) {
  if (force || !cachedPigeons) cachedPigeons = await api.getPigeons();
  if (force || !cachedCategories) cachedCategories = await api.getCategories();
  return { pigeons: cachedPigeons, categories: cachedCategories };
}

export async function renderPigeons(root, hash) {
  const idMatch = hash.match(/^#\/pigeons\/(\d+)/);
  if (idMatch) {
    await renderDetail(root, Number(idMatch[1]));
  } else {
    await renderList(root);
  }
}

function statusLabel(status) {
  const found = PIGEON_STATUSES.find((s) => s.value === status);
  return found ? found.label : status || "Activ";
}

async function renderList(root) {
  const { pigeons, categories } = await loadData(true);

  root.innerHTML = `
    <div class="page-header">
      <h1>Porumbei <span style="color:var(--color-text-muted);font-weight:400;font-size:1rem">(${pigeons.length})</span></h1>
      <button class="btn" id="add-pigeon-btn">${ICONS.plus} Adauga porumbel</button>
    </div>
    <div class="filters-bar">
      <div class="field search-input">
        <label>Cauta</label>
        <input id="filter-search" placeholder="Nume, specie sau serie..." />
      </div>
      <div class="field">
        <label>Categorie</label>
        <select id="filter-category">
          <option value="">Toate</option>
          ${categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Sex</label>
        <select id="filter-sex"><option value="">Toate</option><option value="mascul">Mascul</option><option value="femela">Femela</option></select>
      </div>
      <div class="field">
        <label>Stare</label>
        <select id="filter-status"><option value="">Toate</option>${PIGEON_STATUSES.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}</select>
      </div>
    </div>
    <div id="pigeon-grid" class="grid-cards"></div>
  `;

  const grid = root.querySelector("#pigeon-grid");
  function draw() {
    const q = root.querySelector("#filter-search").value.trim().toLowerCase();
    const cat = root.querySelector("#filter-category").value;
    const sex = root.querySelector("#filter-sex").value;
    const status = root.querySelector("#filter-status").value;

    const filtered = pigeons.filter((p) => {
      if (q) {
        const hay = `${p.name || ""} ${p.species || ""} ${p.ring_number || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cat && String(p.category_id) !== cat) return false;
      if (sex && (p.sex || "").toLowerCase() !== sex) return false;
      if (status && p.status !== status) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${ICONS.pigeon}<p>Niciun porumbel gasit.</p></div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (p) => `
      <div class="pigeon-card" data-id="${p.id}">
        ${p.photo_key ? `<img class="photo" src="${photoUrl(p.photo_key)}" alt="" />` : `<div class="photo placeholder">${ICONS.pigeon}</div>`}
        <div class="body">
          <div class="name">${esc(p.name || "Fara nume")}</div>
          <div class="meta">${esc(p.species || "-")} ${p.ring_number ? "&middot; " + esc(p.ring_number) : ""}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${p.sex ? `<span class="sex-badge ${esc((p.sex || "").toLowerCase())}">${esc(p.sex)}</span>` : ""}
            ${p.category_name ? `<span class="tag"><span class="color-swatch" style="background:${esc(p.category_color)};width:9px;height:9px;margin-right:0"></span>${esc(p.category_name)}</span>` : ""}
            ${p.status && p.status !== "activ" ? `<span class="tag" style="background:var(--color-bg);color:var(--color-text-muted)">${statusLabel(p.status)}</span>` : ""}
          </div>
        </div>
      </div>`
      )
      .join("");

    grid.querySelectorAll(".pigeon-card").forEach((card) => {
      card.addEventListener("click", () => {
        window.location.hash = `#/pigeons/${card.dataset.id}`;
      });
    });
  }

  ["filter-search", "filter-category", "filter-sex", "filter-status"].forEach((id) => {
    root.querySelector("#" + id).addEventListener("input", draw);
  });
  draw();

  root.querySelector("#add-pigeon-btn").addEventListener("click", () => openPigeonForm(null, () => renderList(root)));
}

async function renderDetail(root, id) {
  const pigeon = await api.getPigeon(id);
  const { pigeons } = await loadData();

  const father = pigeon.father_id ? pigeons.find((p) => p.id === pigeon.father_id) : null;
  const mother = pigeon.mother_id ? pigeons.find((p) => p.id === pigeon.mother_id) : null;
  const wins = pigeon.results.filter((r) => Number(r.rank_position) === 1).length;
  const totalPrizeEvents = pigeon.results.filter((r) => r.prize).length;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/pigeons" class="link-btn">&larr; Inapoi la lista</a>
        <h1 style="margin-top:6px">${esc(pigeon.name || "Fara nume")}</h1>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn secondary" id="edit-btn">${ICONS.edit} Editeaza</button>
        <button class="btn danger" id="delete-btn">${ICONS.trash} Sterge</button>
      </div>
    </div>

    <div class="detail-grid">
      <div>
        <img class="detail-photo" src="${photoUrl(pigeon.photo_key) || "/icons/icon-512.png"}" alt="" />
        <div class="kv-list">
          <div class="kv"><span>Specie</span><span>${esc(pigeon.species || "-")}</span></div>
          <div class="kv"><span>Sex</span><span>${esc(pigeon.sex || "-")}</span></div>
          <div class="kv"><span>Serie / inel</span><span>${esc(pigeon.ring_number || "-")}</span></div>
          <div class="kv"><span>Culoare</span><span>${esc(pigeon.color || "-")}</span></div>
          <div class="kv"><span>Data ecloziune</span><span>${fmtDate(pigeon.hatch_date)}</span></div>
          <div class="kv"><span>Cost achizitie</span><span>${fmtMoney(pigeon.cost)}</span></div>
          <div class="kv"><span>Stare sanatate</span><span>${esc(pigeon.health_status || "-")}</span></div>
          <div class="kv"><span>Stare</span><span>${statusLabel(pigeon.status)}</span></div>
          <div class="kv"><span>Categorie</span><span>${pigeon.category_name ? esc(pigeon.category_name) : "-"}</span></div>
          <div class="kv"><span>Tata</span><span>${father ? `<a href="#/pigeons/${father.id}">${esc(father.name || father.ring_number)}</a>` : "-"}</span></div>
          <div class="kv"><span>Mama</span><span>${mother ? `<a href="#/pigeons/${mother.id}">${esc(mother.name || mother.ring_number)}</a>` : "-"}</span></div>
        </div>
      </div>

      <div>
        <div class="stat-grid" style="margin-bottom:16px;">
          <div class="stat-card"><div class="value">${pigeon.results.length}</div><div class="label">Concursuri</div></div>
          <div class="stat-card"><div class="value">${wins}</div><div class="label">Locuri 1</div></div>
          <div class="stat-card"><div class="value">${totalPrizeEvents}</div><div class="label">Premii</div></div>
        </div>

        ${pigeon.notes ? `<div class="card" style="margin-bottom:16px;"><h3>Notite</h3><p style="white-space:pre-wrap">${esc(pigeon.notes)}</p></div>` : ""}

        <h3>Istoric concursuri</h3>
        ${
          pigeon.results.length === 0
            ? `<div class="empty-state">${ICONS.event}<p>Acest porumbel nu a participat inca la niciun concurs.</p></div>`
            : `<div class="table-wrap"><table>
              <thead><tr><th>Concurs</th><th>Data</th><th>Distanta</th><th>Loc</th><th>Viteza</th><th>Coeficient</th></tr></thead>
              <tbody>${pigeon.results
                .map(
                  (r) => `<tr>
                  <td>${esc(r.event_name)}</td>
                  <td>${fmtDate(r.event_date)}</td>
                  <td>${r.distance_km ? r.distance_km + " km" : "-"}</td>
                  <td>${r.rank_position ? "#" + r.rank_position : "-"}</td>
                  <td>${r.speed_m_min ? Number(r.speed_m_min).toFixed(0) + " m/min" : "-"}</td>
                  <td>${r.coefficient ? Number(r.coefficient).toFixed(2) + "%" : "-"}</td>
                </tr>`
                )
                .join("")}</tbody>
            </table></div>`
        }
      </div>
    </div>
  `;

  root.querySelector("#edit-btn").addEventListener("click", () => openPigeonForm(pigeon, () => renderDetail(root, id)));
  root.querySelector("#delete-btn").addEventListener("click", async () => {
    if (!confirmDialog(`Sigur vrei sa stergi ${pigeon.name || "acest porumbel"}? Aceasta actiune nu poate fi anulata.`)) return;
    await api.deletePigeon(id);
    toast("Porumbel sters", "success");
    window.location.hash = "#/pigeons";
  });
}

export async function openPigeonForm(existing, onDone) {
  const { pigeons, categories } = await loadData();
  const otherPigeons = pigeons.filter((p) => !existing || p.id !== existing.id);

  const overlay = openModal({
    title: existing ? "Editeaza porumbel" : "Adauga porumbel",
    bodyHtml: `
      <form id="pigeon-form">
        <div class="photo-upload field">
          <img class="preview" id="pf-preview" src="${existing && existing.photo_key ? photoUrl(existing.photo_key) : "/icons/icon-192.png"}" />
          <div>
            <input type="file" id="pf-photo" accept="image/*" />
            <div class="hint">Poza este redimensionata si comprimata automat inainte de incarcare.</div>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Nume</label><input id="pf-name" value="${esc(existing?.name || "")}" /></div>
          <div class="field"><label>Specie / rasa</label><input id="pf-species" value="${esc(existing?.species || "")}" placeholder="ex: Janssen, Voiajor romanesc..." /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Sex</label>
            <select id="pf-sex">
              <option value="">Nespecificat</option>
              <option value="Mascul" ${existing?.sex === "Mascul" ? "selected" : ""}>Mascul</option>
              <option value="Femela" ${existing?.sex === "Femela" ? "selected" : ""}>Femela</option>
            </select>
          </div>
          <div class="field"><label>Serie / numar inel</label><input id="pf-ring" value="${esc(existing?.ring_number || "")}" placeholder="ex: RO-2024-123456" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Culoare</label><input id="pf-color" value="${esc(existing?.color || "")}" /></div>
          <div class="field"><label>Data ecloziune</label><input type="date" id="pf-hatch" value="${existing?.hatch_date ? existing.hatch_date.slice(0, 10) : ""}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Cost achizitie (RON)</label><input type="number" step="0.01" id="pf-cost" value="${existing?.cost ?? ""}" /></div>
          <div class="field"><label>Stare</label>
            <select id="pf-status">${PIGEON_STATUSES.map((s) => `<option value="${s.value}" ${existing?.status === s.value ? "selected" : ""}>${s.label}</option>`).join("")}</select>
          </div>
        </div>
        <div class="field"><label>Stare sanatate</label><input id="pf-health" value="${esc(existing?.health_status || "")}" list="health-suggestions" placeholder="ex: Sanatos" />
          <datalist id="health-suggestions"><option value="Sanatos"></option><option value="Sub tratament"></option><option value="In recuperare"></option><option value="Vaccinat recent"></option></datalist>
        </div>
        <div class="field"><label>Categorie (optional)</label>
          <select id="pf-category"><option value="">Fara categorie</option>${categories.map((c) => `<option value="${c.id}" ${existing?.category_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
        </div>
        <div class="form-row">
          <div class="field"><label>Tata (optional)</label>
            <select id="pf-father"><option value="">-</option>${otherPigeons.map((p) => `<option value="${p.id}" ${existing?.father_id === p.id ? "selected" : ""}>${esc(p.name || p.ring_number || "#" + p.id)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Mama (optional)</label>
            <select id="pf-mother"><option value="">-</option>${otherPigeons.map((p) => `<option value="${p.id}" ${existing?.mother_id === p.id ? "selected" : ""}>${esc(p.name || p.ring_number || "#" + p.id)}</option>`).join("")}</select>
          </div>
        </div>
        <div class="field"><label>Notite</label><textarea id="pf-notes">${esc(existing?.notes || "")}</textarea></div>
      </form>
    `,
    footerHtml: `<button class="btn secondary" data-close-modal type="button">Anuleaza</button><button class="btn" id="pf-save">Salveaza</button>`,
  });

  let pendingPhotoFile = null;
  overlay.querySelector("#pf-photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      pendingPhotoFile = compressed;
      overlay.querySelector("#pf-preview").src = URL.createObjectURL(compressed);
    } catch (err) {
      toast(err.message, "error");
    }
  });

  overlay.querySelector("#pf-save").addEventListener("click", async () => {
    const saveBtn = overlay.querySelector("#pf-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Se salveaza...";
    try {
      let photo_key = existing?.photo_key || null;
      if (pendingPhotoFile) {
        const uploaded = await api.uploadPhoto(pendingPhotoFile);
        photo_key = uploaded.key;
      }
      const payload = {
        name: overlay.querySelector("#pf-name").value.trim(),
        species: overlay.querySelector("#pf-species").value.trim(),
        sex: overlay.querySelector("#pf-sex").value,
        ring_number: overlay.querySelector("#pf-ring").value.trim(),
        color: overlay.querySelector("#pf-color").value.trim(),
        hatch_date: overlay.querySelector("#pf-hatch").value,
        cost: overlay.querySelector("#pf-cost").value || null,
        status: overlay.querySelector("#pf-status").value,
        health_status: overlay.querySelector("#pf-health").value.trim(),
        category_id: overlay.querySelector("#pf-category").value || null,
        father_id: overlay.querySelector("#pf-father").value || null,
        mother_id: overlay.querySelector("#pf-mother").value || null,
        notes: overlay.querySelector("#pf-notes").value.trim(),
        photo_key,
      };
      if (existing) await api.updatePigeon(existing.id, payload);
      else await api.createPigeon(payload);
      overlay.close();
      toast("Porumbel salvat", "success");
      cachedPigeons = null;
      onDone && onDone();
    } catch (err) {
      toast(err.message, "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "Salveaza";
    }
  });
}
