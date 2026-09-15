import { api } from "../api.js";
import { esc, toast, confirmDialog, openModal, ICONS } from "../utils.js";

const COLOR_PRESETS = ["#1e4e78", "#2f6f4e", "#8a4b2b", "#6b3fa0", "#b6317a", "#374151"];
const ACCENT_PRESETS = ["#6b8f47", "#c98a1f", "#3b82c4", "#c0392b", "#0f766e", "#9333ea"];

export async function renderSettings(root) {
  const [settings, categories] = await Promise.all([api.getSettings(), api.getCategories()]);
  const themeMode = settings.theme_mode || "system";
  const primary = settings.primary_color || "#1e4e78";
  const accent = settings.accent_color || "#6b8f47";
  const fontSize = settings.font_size || "15";

  root.innerHTML = `
    <div class="page-header"><h1>Setari</h1></div>

    <h3 class="section-title">Aspect</h3>
    <div class="card" style="margin-bottom:20px;">
      <div class="field">
        <label>Mod culoare</label>
        <select id="st-theme-mode">
          <option value="system" ${themeMode === "system" ? "selected" : ""}>Automat (dupa dispozitiv)</option>
          <option value="light" ${themeMode === "light" ? "selected" : ""}>Deschis</option>
          <option value="dark" ${themeMode === "dark" ? "selected" : ""}>Intunecat</option>
        </select>
      </div>
      <div class="field">
        <label>Culoare principala</label>
        <div class="swatch-row" id="st-primary-swatches">
          ${COLOR_PRESETS.map((c) => `<span class="swatch-pick ${c === primary ? "selected" : ""}" data-color="${c}" style="background:${c}"></span>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Culoare accent</label>
        <div class="swatch-row" id="st-accent-swatches">
          ${ACCENT_PRESETS.map((c) => `<span class="swatch-pick ${c === accent ? "selected" : ""}" data-color="${c}" style="background:${c}"></span>`).join("")}
        </div>
      </div>
      <div class="field" style="max-width:260px">
        <label>Marime text (px)</label>
        <input type="range" id="st-font-size" min="13" max="18" step="1" value="${fontSize}" />
        <div class="hint" id="st-font-size-value">${fontSize}px</div>
      </div>
      <button class="btn" id="st-save-appearance">Salveaza aspectul</button>
    </div>

    <h3 class="section-title">Categorii porumbei</h3>
    <p class="hint" style="margin-top:-6px">Optional - foloseste categorii doar daca vrei sa grupezi porumbeii (ex: reproducatori, viteza, fond).</p>
    <div class="card" style="margin-bottom:20px;">
      <div class="swatch-row" id="category-list" style="margin-bottom:14px;"></div>
      <div class="form-row">
        <div class="field"><label>Categorie noua</label><input id="new-cat-name" placeholder="ex: Reproducatori" /></div>
        <div class="field"><label>Culoare</label><input type="color" id="new-cat-color" value="#6b8f47" style="height:42px;padding:4px" /></div>
      </div>
      <button class="btn secondary" id="add-category-btn">${ICONS.plus} Adauga categorie</button>
    </div>

    <h3 class="section-title">Cont</h3>
    <div class="card" style="margin-bottom:20px;">
      <button class="btn secondary" id="change-pw-btn">Schimba parola</button>
    </div>

    <h3 class="section-title">Date</h3>
    <div class="card">
      <p class="hint" style="margin-top:0">Exporta o copie de siguranta cu toti porumbeii si concursurile in format JSON.</p>
      <button class="btn secondary" id="export-data-btn">${ICONS.download} Exporta backup JSON</button>
    </div>
  `;

  function renderCategoryList() {
    root.querySelector("#category-list").innerHTML = categories.length
      ? categories
          .map(
            (c) => `<span class="category-chip"><span class="color-swatch" style="background:${c.color}"></span>${esc(c.name)}<button data-id="${c.id}" title="Sterge">${ICONS.close}</button></span>`
          )
          .join("")
      : `<p class="hint" style="margin:0">Nu ai categorii create.</p>`;
    root.querySelectorAll("#category-list button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirmDialog("Stergi aceasta categorie? Porumbeii asociati raman, doar categoria e eliminata.")) return;
        await api.deleteCategory(btn.dataset.id);
        toast("Categorie stearsa", "success");
        renderSettings(root);
      });
    });
  }
  renderCategoryList();

  root.querySelector("#st-font-size").addEventListener("input", (e) => {
    root.querySelector("#st-font-size-value").textContent = e.target.value + "px";
  });

  function wireSwatches(id) {
    const wrap = root.querySelector(id);
    wrap.querySelectorAll(".swatch-pick").forEach((sw) => {
      sw.addEventListener("click", () => {
        wrap.querySelectorAll(".swatch-pick").forEach((s) => s.classList.remove("selected"));
        sw.classList.add("selected");
      });
    });
  }
  wireSwatches("#st-primary-swatches");
  wireSwatches("#st-accent-swatches");

  root.querySelector("#st-save-appearance").addEventListener("click", async () => {
    const selectedPrimary = root.querySelector("#st-primary-swatches .swatch-pick.selected")?.dataset.color || primary;
    const selectedAccent = root.querySelector("#st-accent-swatches .swatch-pick.selected")?.dataset.color || accent;
    const payload = {
      theme_mode: root.querySelector("#st-theme-mode").value,
      primary_color: selectedPrimary,
      accent_color: selectedAccent,
      font_size: root.querySelector("#st-font-size").value,
    };
    await api.saveSettings(payload);
    localStorage.setItem("pt_theme", JSON.stringify(payload));
    applyThemeLive(payload);
    toast("Aspect salvat", "success");
  });

  root.querySelector("#add-category-btn").addEventListener("click", async () => {
    const name = root.querySelector("#new-cat-name").value.trim();
    const color = root.querySelector("#new-cat-color").value;
    if (!name) {
      toast("Introdu un nume pentru categorie", "error");
      return;
    }
    await api.createCategory({ name, color });
    toast("Categorie adaugata", "success");
    renderSettings(root);
  });

  root.querySelector("#change-pw-btn").addEventListener("click", openChangePasswordModal);
  root.querySelector("#export-data-btn").addEventListener("click", exportBackup);
}

function applyThemeLive(settings) {
  const root = document.documentElement;
  if (settings.theme_mode === "dark") root.setAttribute("data-theme", "dark");
  else if (settings.theme_mode === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  if (settings.primary_color) root.style.setProperty("--color-primary", settings.primary_color);
  if (settings.accent_color) root.style.setProperty("--color-accent", settings.accent_color);
  if (settings.font_size) document.body.style.fontSize = settings.font_size + "px";
}

function openChangePasswordModal() {
  const overlay = openModal({
    title: "Schimba parola",
    bodyHtml: `
      <div class="field"><label>Parola curenta</label><input type="password" id="cp-current" /></div>
      <div class="field"><label>Parola noua</label><input type="password" id="cp-new" minlength="6" /></div>
      <div class="field"><label>Confirma parola noua</label><input type="password" id="cp-confirm" minlength="6" /></div>
    `,
    footerHtml: `<button class="btn secondary" data-close-modal type="button">Anuleaza</button><button class="btn" id="cp-save">Salveaza</button>`,
  });
  overlay.querySelector("#cp-save").addEventListener("click", async () => {
    const current = overlay.querySelector("#cp-current").value;
    const next = overlay.querySelector("#cp-new").value;
    const confirm = overlay.querySelector("#cp-confirm").value;
    if (next !== confirm) {
      toast("Parolele noi nu coincid", "error");
      return;
    }
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      overlay.close();
      toast("Parola a fost schimbata", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

async function exportBackup() {
  try {
    const [pigeons, events, results, categories, settings] = await Promise.all([
      api.getPigeons(),
      api.getEvents(),
      api.getResults(),
      api.getCategories(),
      api.getSettings(),
    ]);
    const backup = { exportedAt: new Date().toISOString(), pigeons, events, results, categories, settings };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pigeontrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast("Nu am putut exporta backup-ul", "error");
  }
}
