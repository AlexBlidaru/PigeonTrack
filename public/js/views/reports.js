import { api } from "../api.js";
import { fmtDate, fmtMoney, esc, toast, ICONS, EVENT_CATEGORIES } from "../utils.js";

let vendorLoaded = false;
function loadVendorScripts() {
  if (vendorLoaded) return Promise.resolve();
  const scripts = ["/js/vendor/jspdf.umd.min.js", "/js/vendor/jspdf.plugin.autotable.min.js"];
  return scripts
    .reduce(
      (chain, src) =>
        chain.then(
          () =>
            new Promise((resolve, reject) => {
              const s = document.createElement("script");
              s.src = src;
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            })
        ),
      Promise.resolve()
    )
    .then(() => {
      vendorLoaded = true;
    });
}

function categoryLabel(value) {
  const found = EVENT_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value || "-";
}

export async function renderReports(root) {
  const [pigeons, results] = await Promise.all([api.getPigeons(), api.getResults()]);

  root.innerHTML = `
    <div class="page-header">
      <h1>Rapoarte</h1>
      <button class="btn" id="export-pdf-btn">${ICONS.download} Exporta PDF</button>
    </div>
    <div class="filters-bar">
      <div class="field"><label>De la data</label><input type="date" id="rf-from" /></div>
      <div class="field"><label>Pana la data</label><input type="date" id="rf-to" /></div>
      <div class="field"><label>Porumbel</label>
        <select id="rf-pigeon"><option value="">Toti</option>${pigeons.map((p) => `<option value="${p.id}">${esc(p.name || p.ring_number || "#" + p.id)}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Categorie</label>
        <select id="rf-category"><option value="">Toate</option>${EVENT_CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("")}</select>
      </div>
    </div>
    <div id="report-stats" class="stat-grid"></div>
    <div id="report-table"></div>
  `;

  const inputs = ["rf-from", "rf-to", "rf-pigeon", "rf-category"].map((id) => root.querySelector("#" + id));
  function currentFilters() {
    return {
      from: inputs[0].value,
      to: inputs[1].value,
      pigeonId: inputs[2].value,
      category: inputs[3].value,
    };
  }

  function applyFilters() {
    const f = currentFilters();
    return results.filter((r) => {
      if (f.from && r.event_date < f.from) return false;
      if (f.to && r.event_date > f.to) return false;
      if (f.pigeonId && String(r.pigeon_id) !== f.pigeonId) return false;
      if (f.category && r.event_category !== f.category) return false;
      return true;
    });
  }

  function draw() {
    const filtered = applyFilters();
    const uniqueEvents = new Set(filtered.map((r) => r.event_id));
    const totalEntryCost = [...uniqueEvents].reduce((sum, eid) => {
      const r = filtered.find((x) => x.event_id === eid);
      return sum + (Number(r.entry_cost) || 0);
    }, 0);
    const wins = filtered.filter((r) => Number(r.rank_position) === 1).length;
    const top3 = filtered.filter((r) => Number(r.rank_position) >= 1 && Number(r.rank_position) <= 3).length;
    const avgCoef = filtered.length
      ? filtered.filter((r) => r.coefficient != null).reduce((s, r) => s + Number(r.coefficient), 0) / (filtered.filter((r) => r.coefficient != null).length || 1)
      : 0;

    root.querySelector("#report-stats").innerHTML = `
      <div class="stat-card"><div class="value">${uniqueEvents.size}</div><div class="label">Concursuri</div></div>
      <div class="stat-card"><div class="value">${filtered.length}</div><div class="label">Participari</div></div>
      <div class="stat-card"><div class="value">${wins}</div><div class="label">Locuri 1</div></div>
      <div class="stat-card"><div class="value">${top3}</div><div class="label">Locuri 1-3</div></div>
      <div class="stat-card"><div class="value">${avgCoef ? avgCoef.toFixed(2) + "%" : "-"}</div><div class="label">Coeficient mediu</div></div>
      <div class="stat-card"><div class="value">${fmtMoney(totalEntryCost)}</div><div class="label">Costuri participare</div></div>
    `;

    root.querySelector("#report-table").innerHTML = filtered.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>Concurs</th><th>Categorie</th><th>Porumbel</th><th>Distanta</th><th>Loc</th><th>Coeficient</th><th>Premiu</th><th>Cost participare</th></tr></thead>
          <tbody>${filtered
            .map(
              (r) => `<tr>
              <td>${fmtDate(r.event_date)}</td>
              <td>${esc(r.event_name)}</td>
              <td>${categoryLabel(r.event_category)}</td>
              <td>${esc(r.pigeon_name || r.ring_number || "-")}</td>
              <td>${r.distance_km ? r.distance_km + " km" : "-"}</td>
              <td>${r.rank_position ? "#" + r.rank_position : "-"}</td>
              <td>${r.coefficient ? Number(r.coefficient).toFixed(2) + "%" : "-"}</td>
              <td>${esc(r.prize || "-")}</td>
              <td>${fmtMoney(r.entry_cost)}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table></div>`
      : `<div class="empty-state">${ICONS.report}<p>Niciun rezultat pentru filtrele selectate.</p></div>`;
  }

  inputs.forEach((inp) => inp.addEventListener("input", draw));
  draw();

  root.querySelector("#export-pdf-btn").addEventListener("click", async () => {
    const btn = root.querySelector("#export-pdf-btn");
    btn.disabled = true;
    btn.textContent = "Se genereaza...";
    try {
      await loadVendorScripts();
      exportPdf(applyFilters(), currentFilters(), pigeons);
    } catch (err) {
      console.error(err);
      toast("Nu am putut genera PDF-ul", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${ICONS.download} Exporta PDF`;
    }
  });
}

function exportPdf(filtered, filters, pigeons) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("PigeonTrack - Raport concursuri", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  const genDate = new Date().toLocaleDateString("ro-RO");
  let sub = `Generat la ${genDate}`;
  if (filters.from || filters.to) sub += ` | Perioada: ${filters.from || "..."} - ${filters.to || "..."}`;
  if (filters.pigeonId) {
    const p = pigeons.find((x) => String(x.id) === filters.pigeonId);
    if (p) sub += ` | Porumbel: ${p.name || p.ring_number}`;
  }
  doc.text(sub, 14, 25);

  const uniqueEvents = new Set(filtered.map((r) => r.event_id));
  const wins = filtered.filter((r) => Number(r.rank_position) === 1).length;
  const totalEntryCost = [...uniqueEvents].reduce((sum, eid) => {
    const r = filtered.find((x) => x.event_id === eid);
    return sum + (Number(r.entry_cost) || 0);
  }, 0);

  doc.autoTable({
    startY: 32,
    head: [["Concursuri", "Participari", "Locuri 1", "Costuri participare"]],
    body: [[uniqueEvents.size, filtered.length, wins, `${totalEntryCost.toLocaleString("ro-RO")} RON`]],
    theme: "plain",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 78, 120], textColor: 255 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Data", "Concurs", "Categorie", "Porumbel", "Distanta", "Loc", "Coef.", "Premiu"]],
    body: filtered.map((r) => [
      r.event_date ? new Date(r.event_date).toLocaleDateString("ro-RO") : "-",
      r.event_name || "-",
      categoryLabel(r.event_category),
      r.pigeon_name || r.ring_number || "-",
      r.distance_km ? `${r.distance_km} km` : "-",
      r.rank_position ? `#${r.rank_position}` : "-",
      r.coefficient ? `${Number(r.coefficient).toFixed(2)}%` : "-",
      r.prize || "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 78, 120], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 249] },
  });

  doc.save(`pigeontrack-raport-${new Date().toISOString().slice(0, 10)}.pdf`);
}
