import { api } from "../api.js";
import { fmtMoney, esc, openModal, ICONS } from "../utils.js";

let cachedPigeons = null;
let currentTab = "list";
let currentRootId = null;

async function loadPigeons(force) {
  if (force || !cachedPigeons) cachedPigeons = await api.getPigeons();
  return cachedPigeons;
}

function byId(pigeons) {
  const map = new Map();
  pigeons.forEach((p) => map.set(p.id, p));
  return map;
}

export async function renderPedigree(root) {
  const pigeons = await loadPigeons(true);
  root.innerHTML = `
    <div class="page-header"><h1>Pedigree</h1></div>
    <div class="tabs">
      <button class="tab-btn ${currentTab === "list" ? "active" : ""}" data-tab="list">Lista</button>
      <button class="tab-btn ${currentTab === "tree" ? "active" : ""}" data-tab="tree">Arbore genealogic</button>
    </div>
    <div id="ped-content"></div>
  `;
  root.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      renderPedigree(root);
    });
  });

  const content = root.querySelector("#ped-content");
  if (currentTab === "list") await renderListTab(content, pigeons, root);
  else await renderTreeTab(content, pigeons);
}

async function renderListTab(content, pigeons, outerRoot) {
  content.innerHTML = `<div class="loading-spinner"></div>`;
  const map = byId(pigeons);

  // Wins per pigeon computed from the flat results feed (one request for everyone).
  const results = await api.getResults();
  const winsByPigeon = new Map();
  const eventsByPigeon = new Map();
  for (const r of results) {
    eventsByPigeon.set(r.pigeon_id, (eventsByPigeon.get(r.pigeon_id) || 0) + 1);
    if (Number(r.rank_position) === 1) winsByPigeon.set(r.pigeon_id, (winsByPigeon.get(r.pigeon_id) || 0) + 1);
  }

  if (pigeons.length === 0) {
    content.innerHTML = `<div class="empty-state">${ICONS.tree}<p>Adauga porumbei pentru a construi arborele genealogic.</p></div>`;
    return;
  }

  content.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Porumbel</th><th>Serie</th><th>Tata</th><th>Mama</th><th>Cost</th><th>Concursuri castigate</th><th></th></tr></thead>
    <tbody>${pigeons
      .map((p) => {
        const father = p.father_id ? map.get(p.father_id) : null;
        const mother = p.mother_id ? map.get(p.mother_id) : null;
        return `<tr>
          <td>${esc(p.name || "Fara nume")}</td>
          <td>${esc(p.ring_number || "-")}</td>
          <td>${father ? esc(father.name || father.ring_number) : "-"}</td>
          <td>${mother ? esc(mother.name || mother.ring_number) : "-"}</td>
          <td>${fmtMoney(p.cost)}</td>
          <td>${winsByPigeon.get(p.id) || 0} ${ICONS.medal.replace("<svg", '<svg style="width:13px;height:13px;vertical-align:-2px;opacity:.6"')}</td>
          <td style="display:flex;gap:6px">
            <button class="btn secondary small view-tree-btn" data-id="${p.id}">Arbore</button>
            <button class="btn secondary small details-btn" data-id="${p.id}">Detalii</button>
          </td>
        </tr>`;
      })
      .join("")}</tbody>
  </table></div>`;

  content.querySelectorAll(".view-tree-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRootId = Number(btn.dataset.id);
      currentTab = "tree";
      renderPedigree(outerRoot);
    });
  });
  content.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", () => showDetailsModal(map.get(Number(btn.dataset.id)), map, eventsByPigeon.get(Number(btn.dataset.id)) || 0, winsByPigeon.get(Number(btn.dataset.id)) || 0));
  });
}

function showDetailsModal(pigeon, map, eventsCount, winsCount) {
  if (!pigeon) return;
  const father = pigeon.father_id ? map.get(pigeon.father_id) : null;
  const mother = pigeon.mother_id ? map.get(pigeon.mother_id) : null;
  const siblings = [...map.values()].filter(
    (p) => p.id !== pigeon.id && ((pigeon.father_id && p.father_id === pigeon.father_id) || (pigeon.mother_id && p.mother_id === pigeon.mother_id))
  );

  const overlay = openModal({
    title: pigeon.name || pigeon.ring_number || "Detalii porumbel",
    bodyHtml: `
      <div class="kv-list">
        <div class="kv"><span>Serie</span><span>${esc(pigeon.ring_number || "-")}</span></div>
        <div class="kv"><span>Specie</span><span>${esc(pigeon.species || "-")}</span></div>
        <div class="kv"><span>Sex</span><span>${esc(pigeon.sex || "-")}</span></div>
        <div class="kv"><span>Cost achizitie</span><span>${fmtMoney(pigeon.cost)}</span></div>
        <div class="kv"><span>Stare sanatate</span><span>${esc(pigeon.health_status || "-")}</span></div>
        <div class="kv"><span>Concursuri</span><span>${eventsCount}</span></div>
        <div class="kv"><span>Locuri 1</span><span>${winsCount}</span></div>
        <div class="kv"><span>Tata</span><span>${father ? esc(father.name || father.ring_number) : "-"}</span></div>
        <div class="kv"><span>Mama</span><span>${mother ? esc(mother.name || mother.ring_number) : "-"}</span></div>
        <div class="kv"><span>Frati/surori inregistrati</span><span>${siblings.length ? siblings.map((s) => esc(s.name || s.ring_number)).join(", ") : "-"}</span></div>
      </div>
      ${pigeon.notes ? `<h3 style="margin-top:16px">Notite</h3><p style="white-space:pre-wrap">${esc(pigeon.notes)}</p>` : ""}
      <a class="btn secondary small" style="margin-top:14px" href="#/pigeons/${pigeon.id}">Deschide fisa completa</a>
    `,
    footerHtml: `<button class="btn secondary" data-close-modal type="button">Inchide</button>`,
  });
}

async function renderTreeTab(content, pigeons) {
  const map = byId(pigeons);
  if (!currentRootId && pigeons.length) currentRootId = pigeons[0].id;

  content.innerHTML = `
    <div class="field" style="max-width:320px;margin-bottom:16px;">
      <label>Porumbel selectat</label>
      <select id="tree-select">${pigeons.map((p) => `<option value="${p.id}" ${p.id === currentRootId ? "selected" : ""}>${esc(p.name || p.ring_number || "#" + p.id)}</option>`).join("")}</select>
    </div>
    <div id="tree-render"></div>
    <h3 class="section-title">Descendenti directi</h3>
    <div id="tree-children"></div>
    <h3 class="section-title">Frati / surori</h3>
    <div id="tree-siblings"></div>
  `;

  content.querySelector("#tree-select").addEventListener("change", (e) => {
    currentRootId = Number(e.target.value);
    renderTreeTab(content, pigeons);
  });

  const root = map.get(currentRootId);
  if (!root) {
    content.querySelector("#tree-render").innerHTML = `<div class="empty-state">${ICONS.tree}<p>Adauga porumbei pentru a vedea arborele.</p></div>`;
    return;
  }

  function node(p, label) {
    if (!p) return `<div class="ped-node empty">${label ? esc(label) : "Necunoscut"}</div>`;
    return `<div class="ped-node ${p.id === currentRootId ? "root" : ""}" data-id="${p.id}">
      <div class="n-name">${esc(p.name || p.ring_number || "#" + p.id)}</div>
      <div class="n-meta">${esc(p.ring_number || "")}</div>
      <div class="n-meta">${fmtMoney(p.cost)}</div>
    </div>`;
  }

  const father = root.father_id ? map.get(root.father_id) : null;
  const mother = root.mother_id ? map.get(root.mother_id) : null;
  const fatherFather = father?.father_id ? map.get(father.father_id) : null;
  const fatherMother = father?.mother_id ? map.get(father.mother_id) : null;
  const motherFather = mother?.father_id ? map.get(mother.father_id) : null;
  const motherMother = mother?.mother_id ? map.get(mother.mother_id) : null;

  const ggpairs = [
    fatherFather?.father_id ? map.get(fatherFather.father_id) : null,
    fatherFather?.mother_id ? map.get(fatherFather.mother_id) : null,
    fatherMother?.father_id ? map.get(fatherMother.father_id) : null,
    fatherMother?.mother_id ? map.get(fatherMother.mother_id) : null,
    motherFather?.father_id ? map.get(motherFather.father_id) : null,
    motherFather?.mother_id ? map.get(motherFather.mother_id) : null,
    motherMother?.father_id ? map.get(motherMother.father_id) : null,
    motherMother?.mother_id ? map.get(motherMother.mother_id) : null,
  ];

  content.querySelector("#tree-render").innerHTML = `
    <div class="pedigree-tree-wrap">
      <div class="pedigree-tree">
        <div class="ped-gen">${node(root)}</div>
        <div class="ped-gen">${node(father, "Tata")}${node(mother, "Mama")}</div>
        <div class="ped-gen">${node(fatherFather, "Bunic patern")}${node(fatherMother, "Bunica paterna")}${node(motherFather, "Bunic matern")}${node(motherMother, "Bunica materna")}</div>
        <div class="ped-gen">${ggpairs.map((g) => node(g, "Stra-bunic")).join("")}</div>
      </div>
    </div>
  `;
  content.querySelectorAll(".ped-node[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      currentRootId = Number(el.dataset.id);
      renderTreeTab(content, pigeons);
    });
  });

  const children = pigeons.filter((p) => p.father_id === root.id || p.mother_id === root.id);
  content.querySelector("#tree-children").innerHTML = children.length
    ? children.map((c) => `<div class="pedigree-list-item"><span>${esc(c.name || c.ring_number)}</span><button class="link-btn" data-id="${c.id}">Vezi arbore</button></div>`).join("")
    : `<p style="color:var(--color-text-muted)">Niciun descendent inregistrat.</p>`;
  content.querySelectorAll("#tree-children .link-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRootId = Number(btn.dataset.id);
      renderTreeTab(content, pigeons);
    });
  });

  const siblings = pigeons.filter(
    (p) => p.id !== root.id && ((root.father_id && p.father_id === root.father_id) || (root.mother_id && p.mother_id === root.mother_id))
  );
  content.querySelector("#tree-siblings").innerHTML = siblings.length
    ? siblings.map((s) => `<div class="pedigree-list-item"><span>${esc(s.name || s.ring_number)}</span><button class="link-btn" data-id="${s.id}">Vezi arbore</button></div>`).join("")
    : `<p style="color:var(--color-text-muted)">Niciun frate/sora inregistrat.</p>`;
  content.querySelectorAll("#tree-siblings .link-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRootId = Number(btn.dataset.id);
      renderTreeTab(content, pigeons);
    });
  });
}
